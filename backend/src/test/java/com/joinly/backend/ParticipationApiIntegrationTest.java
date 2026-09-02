package com.joinly.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.joinly.backend.authentication.SupabaseAuthClient;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Hermetic Phase 3 coverage: direct/approval/invitation joins, abandonment, blocks and the
 * concurrent last-place race (B-04..B-09). Real PostGIS via Testcontainers; Supabase mocked and
 * JWTs synthetic.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ParticipationApiIntegrationTest {

  @Container
  static final PostgreSQLContainer<?> postgres =
      new PostgreSQLContainer<>(
              DockerImageName.parse("postgis/postgis:16-3.4").asCompatibleSubstituteFor("postgres"))
          .withDatabaseName("joinly_test")
          .withUsername("joinly")
          .withPassword("joinly");

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate jdbc;
  @Autowired ObjectMapper objectMapper;

  @MockitoBean SupabaseAuthClient supabaseAuth;

  private static final double LON = -8.7207;
  private static final double LAT = 42.2383;

  @BeforeEach
  void resetState() {
    jdbc.update("DELETE FROM notifications");
    jdbc.update("DELETE FROM idempotency_records");
    jdbc.update("DELETE FROM participations");
    jdbc.update("DELETE FROM invitations");
    jdbc.update("DELETE FROM blocks");
    jdbc.update("DELETE FROM events");
    jdbc.update("DELETE FROM users");
    when(supabaseAuth.emailVerified(any())).thenReturn(true);
  }

  @Test
  void directJoinConfirmsAndRevealsExactLocationToTheParticipantOnly() throws Exception {
    UUID creator = insertUser("host", true);
    UUID joiner = insertUser("joiner", true);
    UUID eventId = createEvent(creator, "direct", 5);

    join(joiner, eventId, "k1", null)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("confirmed"))
        .andExpect(jsonPath("$.resolvedAt").isNotEmpty());

    // B-04: confirmed participant sees exactLocation, not the participant list
    mvc.perform(authored(get("/api/v1/events/" + eventId), joiner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.exactLocation.type").value("Point"))
        .andExpect(jsonPath("$.confirmedParticipants").doesNotExist())
        .andExpect(jsonPath("$.myParticipation").value("confirmed"))
        .andExpect(jsonPath("$.confirmedCount").value(1));

    // B-05: only the creator lists participants
    mvc.perform(authored(get("/api/v1/events/" + eventId + "/participations"), creator))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.items[0].user.alias").value("joiner"));
    mvc.perform(authored(get("/api/v1/events/" + eventId + "/participations"), joiner))
        .andExpect(status().isNotFound());
  }

  @Test
  void refusesTheCreatorJoiningTheirOwnEvent() throws Exception {
    UUID creator = insertUser("selfHost", true);
    UUID eventId = createEvent(creator, "direct", 5);

    join(creator, eventId, "k1", null)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("cannot_join_own_event"));
  }

  @Test
  void concurrentJoinsToTheLastPlaceConfirmAtMostOne() throws Exception {
    UUID creator = insertUser("raceHost", true);
    UUID racerA = insertUser("racerA", true);
    UUID racerB = insertUser("racerB", true);
    UUID eventId = createEvent(creator, "direct", 1);

    ExecutorService pool = Executors.newFixedThreadPool(2);
    CountDownLatch ready = new CountDownLatch(2);
    CountDownLatch go = new CountDownLatch(1);
    Future<Integer> a = pool.submit(joinAttempt(racerA, eventId, "ka", ready, go));
    Future<Integer> b = pool.submit(joinAttempt(racerB, eventId, "kb", ready, go));
    ready.await(5, TimeUnit.SECONDS);
    go.countDown();
    int statusA = a.get(15, TimeUnit.SECONDS);
    int statusB = b.get(15, TimeUnit.SECONDS);
    pool.shutdown();

    assertThat(List.of(statusA, statusB)).containsExactlyInAnyOrder(201, 409);
    Integer confirmed =
        jdbc.queryForObject(
            "SELECT count(*) FROM participations WHERE event_id = ? AND status = 'confirmed'",
            Integer.class,
            eventId);
    assertThat(confirmed).isEqualTo(1);
  }

  @Test
  void rejectsJoiningFullCancelledHiddenOrStartedEvents() throws Exception {
    UUID creator = insertUser("gatekeeper", true);
    UUID joiner = insertUser("wouldBe", true);

    UUID full = createEvent(creator, "direct", 1);
    join(insertUser("firstIn", true), full, "kf", null).andExpect(status().isCreated());
    join(joiner, full, "k1", null)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("event_full"));

    UUID cancelled = createEvent(creator, "direct", 5);
    mvc.perform(
            authored(post("/api/v1/events/" + cancelled + "/cancellation"), creator).content("{}"))
        .andExpect(status().isNoContent());
    join(joiner, cancelled, "k2", null)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("event_not_joinable"));

    UUID hidden = createEvent(creator, "direct", 5);
    jdbc.update("UPDATE events SET is_hidden = true WHERE id = ?", hidden);
    join(joiner, hidden, "k3", null).andExpect(status().isNotFound());

    UUID started = insertStartedEvent(creator, "direct");
    join(joiner, started, "k4", null)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("event_not_joinable"));
  }

  @Test
  void abandoningBeforeStartFreesThePlace() throws Exception {
    UUID creator = insertUser("host9", true);
    UUID first = insertUser("firstNine", true);
    UUID second = insertUser("secondNine", true);
    UUID eventId = createEvent(creator, "direct", 1);

    join(first, eventId, "k1", null).andExpect(status().isCreated());
    join(second, eventId, "k2", null).andExpect(status().isConflict());

    mvc.perform(authored(delete("/api/v1/events/" + eventId + "/participation"), first))
        .andExpect(status().isNoContent());
    // idempotent
    mvc.perform(authored(delete("/api/v1/events/" + eventId + "/participation"), first))
        .andExpect(status().isNoContent());

    join(second, eventId, "k3", null)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("confirmed"));
  }

  @Test
  void reciprocalBlockHidesTheEventAndDeniesJoining() throws Exception {
    UUID creator = insertUser("blockedHost", true);
    UUID joiner = insertUser("blocker", true);
    UUID eventId = createEvent(creator, "direct", 5);

    UUID creatorInternalId =
        jdbc.queryForObject("SELECT id FROM users WHERE auth_subject = ?", UUID.class, creator);
    mvc.perform(
            authored(post("/api/v1/blocks"), joiner)
                .content("{\"blockedUserId\":\"" + creatorInternalId + "\"}"))
        .andExpect(status().isCreated());

    mvc.perform(authored(get("/api/v1/events/" + eventId), joiner))
        .andExpect(status().isNotFound());
    mvc.perform(authored(post("/api/v1/events/search"), joiner).content(searchJson(LON, LAT, 5000)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isEmpty());
    join(joiner, eventId, "k1", null).andExpect(status().isNotFound());
  }

  @Test
  void blockingAfterConfirmationHidesTheEventButStillAllowsAbandonment() throws Exception {
    UUID creator = insertUser("confirmedHost", true);
    UUID participant = insertUser("confirmedGuest", true);
    UUID eventId = createEvent(creator, "direct", 1);
    join(participant, eventId, "confirmed-block", null).andExpect(status().isCreated());
    UUID creatorId =
        jdbc.queryForObject("SELECT id FROM users WHERE auth_subject = ?", UUID.class, creator);

    mvc.perform(
            authored(post("/api/v1/blocks"), participant)
                .content("{\"blockedUserId\":\"" + creatorId + "\"}"))
        .andExpect(status().isCreated());
    mvc.perform(authored(get("/api/v1/events/" + eventId), participant))
        .andExpect(status().isNotFound());
    mvc.perform(authored(get("/api/v1/events/" + eventId + "/participations"), creator))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.items[0].user.alias").value("confirmedGuest"));

    mvc.perform(authored(delete("/api/v1/events/" + eventId + "/participation"), participant))
        .andExpect(status().isNoContent());
  }

  @Test
  void approvalFlowLetsTheCreatorConfirmOrRejectAndReRequest() throws Exception {
    UUID creator = insertUser("approver", true);
    UUID first = insertUser("askerOne", true);
    UUID second = insertUser("askerTwo", true);
    UUID eventId = createEvent(creator, "approval", 5);

    join(first, eventId, "k1", null)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("pending"));
    join(second, eventId, "k2", null).andExpect(status().isCreated());

    // creator finds pending requests
    String pending =
        mvc.perform(
                authored(
                    get("/api/v1/events/" + eventId + "/participations?status=pending"), creator))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID firstRequest =
        UUID.fromString(
            objectMapper.readTree(pending).get("items").get(0).get("participationId").asText());
    UUID secondRequest =
        UUID.fromString(
            objectMapper.readTree(pending).get("items").get(1).get("participationId").asText());

    // resolving a still-pending request requires If-Match
    mvc.perform(
            authored(
                    patch("/api/v1/events/" + eventId + "/participations/" + secondRequest),
                    creator)
                .content("{\"status\":\"rejected\"}"))
        .andExpect(status().isPreconditionRequired())
        .andExpect(jsonPath("$.code").value("if_match_required"));

    mvc.perform(
            authored(
                    patch("/api/v1/events/" + eventId + "/participations/" + firstRequest), creator)
                .header(HttpHeaders.IF_MATCH, "\"participation-0\"")
                .content("{\"status\":\"confirmed\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("confirmed"));

    mvc.perform(
            authored(
                    patch("/api/v1/events/" + eventId + "/participations/" + secondRequest),
                    creator)
                .header(HttpHeaders.IF_MATCH, "\"participation-0\"")
                .content("{\"status\":\"rejected\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("rejected"));

    // a rejected user may request again
    join(second, eventId, "k3", null)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("pending"));

    // resolving an already-resolved request is a conflict
    mvc.perform(
            authored(
                    patch("/api/v1/events/" + eventId + "/participations/" + firstRequest), creator)
                .header(HttpHeaders.IF_MATCH, "\"participation-1\"")
                .content("{\"status\":\"rejected\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("participation_not_pending"));
  }

  @Test
  void privateInvitationJoinConsumesTheCodeAndRejectsRevokedOrExhaustedOnes() throws Exception {
    UUID creator = insertUser("privateHost", true);
    UUID guestOne = insertUser("guestOne", true);
    UUID guestTwo = insertUser("guestTwo", true);
    UUID eventId = createEvent(creator, "privateInvitation", 10);

    String invitation =
        mvc.perform(
                authored(post("/api/v1/events/" + eventId + "/invitations"), creator)
                    .content("{\"maxUses\":1}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code").isNotEmpty())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String code = objectMapper.readTree(invitation).get("code").asText();

    join(guestOne, eventId, "k1", code)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("confirmed"));
    // maxUses = 1 exhausted
    join(guestTwo, eventId, "k2", code)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("invitation_invalid"));

    // missing code -> 404 (never reveal the private event)
    join(guestTwo, eventId, "k3", null).andExpect(status().isNotFound());

    // a fresh invitation, then revoked
    String second =
        mvc.perform(
                authored(post("/api/v1/events/" + eventId + "/invitations"), creator).content("{}"))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID invitationId = UUID.fromString(objectMapper.readTree(second).get("id").asText());
    String secondCode = objectMapper.readTree(second).get("code").asText();
    mvc.perform(
            authored(delete("/api/v1/events/" + eventId + "/invitations/" + invitationId), creator))
        .andExpect(status().isNoContent());
    join(guestTwo, eventId, "k4", secondCode)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("invitation_invalid"));
  }

  @Test
  void idempotencyKeyReplaysTheParticipationAndConflictsOnAReusedKey() throws Exception {
    UUID creator = insertUser("idemHost", true);
    UUID joiner = insertUser("idemJoiner", true);
    UUID eventOne = createEvent(creator, "direct", 5);
    UUID eventTwo = createEvent(creator, "direct", 5);

    String first =
        join(joiner, eventOne, "same-key", null)
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String replay =
        join(joiner, eventOne, "same-key", null)
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(objectMapper.readTree(replay).get("id").asText())
        .isEqualTo(objectMapper.readTree(first).get("id").asText());

    // same key, different request (other event) -> conflict
    join(joiner, eventTwo, "same-key", null)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("idempotency_key_conflict"));
  }

  @Test
  void blocksAreIdempotentListableAndRemovable() throws Exception {
    UUID owner = insertUser("blockOwner", true);
    UUID target = insertUser("blockTarget", true);
    UUID targetInternalId =
        jdbc.queryForObject("SELECT id FROM users WHERE auth_subject = ?", UUID.class, target);
    String body = "{\"blockedUserId\":\"" + targetInternalId + "\"}";

    mvc.perform(authored(post("/api/v1/blocks"), owner).content(body))
        .andExpect(status().isCreated());
    mvc.perform(authored(post("/api/v1/blocks"), owner).content(body))
        .andExpect(status().isCreated()); // idempotent
    mvc.perform(authored(get("/api/v1/blocks"), owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.items[0].user.alias").value("blockTarget"));

    mvc.perform(authored(delete("/api/v1/blocks/" + targetInternalId), owner))
        .andExpect(status().isNoContent());
    mvc.perform(authored(delete("/api/v1/blocks/" + targetInternalId), owner))
        .andExpect(status().isNoContent()); // idempotent
    mvc.perform(authored(get("/api/v1/blocks"), owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isEmpty());

    mvc.perform(
            authored(post("/api/v1/blocks"), owner)
                .content(
                    "{\"blockedUserId\":\""
                        + jdbc.queryForObject(
                            "SELECT id FROM users WHERE auth_subject = ?", UUID.class, owner)
                        + "\"}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("cannot_block_self"));
  }

  // --- helpers -------------------------------------------------------------

  private Callable<Integer> joinAttempt(
      UUID subject, UUID eventId, String key, CountDownLatch ready, CountDownLatch go) {
    return () -> {
      ready.countDown();
      go.await(5, TimeUnit.SECONDS);
      return join(subject, eventId, key, null).andReturn().getResponse().getStatus();
    };
  }

  private org.springframework.test.web.servlet.ResultActions join(
      UUID subject, UUID eventId, String idempotencyKey, String invitationCode) throws Exception {
    MockHttpServletRequestBuilder builder =
        authored(post("/api/v1/events/" + eventId + "/participations"), subject)
            .header("Idempotency-Key", idempotencyKey);
    builder.content(
        invitationCode == null ? "{}" : "{\"invitationCode\":\"" + invitationCode + "\"}");
    return mvc.perform(builder);
  }

  private MockHttpServletRequestBuilder authored(
      MockHttpServletRequestBuilder builder, UUID subject) {
    return builder
        .with(
            jwt()
                .jwt(
                    jwtBuilder ->
                        jwtBuilder
                            .subject(subject.toString())
                            .claim("aud", List.of("authenticated"))))
        .contentType(MediaType.APPLICATION_JSON);
  }

  private UUID insertUser(String alias, boolean emailVerified) {
    return jdbc.queryForObject(
        """
        INSERT INTO users (auth_subject, alias, alias_normalized, email_verified, adult_confirmed_at,
            terms_version, privacy_version, guidelines_version,
            terms_accepted_at, privacy_accepted_at, guidelines_accepted_at)
        VALUES (?, ?, ?, ?, now(), 'v1', 'v1', 'v1', now(), now(), now())
        RETURNING auth_subject
        """,
        UUID.class,
        UUID.randomUUID(),
        alias,
        alias.toLowerCase(),
        emailVerified);
  }

  private UUID createEvent(UUID creatorSubject, String accessMode, Integer capacity)
      throws Exception {
    Map<String, Object> event = new LinkedHashMap<>();
    event.put("title", "Evento de prueba");
    event.put("description", "Descripcion de prueba");
    event.put("category", "sportWellbeing");
    event.put("startsAt", Instant.now().plus(Duration.ofDays(7)).toString());
    event.put("durationMinutes", 120);
    event.put("exactLocation", Map.of("type", "Point", "coordinates", List.of(LON, LAT)));
    event.put("accessMode", accessMode);
    if (capacity != null) {
      event.put("capacity", capacity);
    }
    String body =
        mvc.perform(
                authored(post("/api/v1/events"), creatorSubject)
                    .content(objectMapper.writeValueAsString(event)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).get("id").asText());
  }

  private UUID insertStartedEvent(UUID creatorSubject, String dbAccessMode) {
    return jdbc.queryForObject(
        """
        INSERT INTO events (creator_id, title, description, category, starts_at, duration_minutes,
            location, approximate_area, access_mode, status)
        SELECT u.id, 'Evento pasado', 'Descripcion', 'sport_wellbeing',
               now() - interval '2 hours', 60,
               ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, 'Zona', ?::event_access_mode,
               'published'
        FROM users u WHERE u.auth_subject = ?
        RETURNING id
        """,
        UUID.class,
        LON,
        LAT,
        dbAccessMode,
        creatorSubject);
  }

  private String searchJson(double lon, double lat, int radius) throws Exception {
    Map<String, Object> search = new LinkedHashMap<>();
    search.put("origin", Map.of("type", "Point", "coordinates", List.of(lon, lat)));
    search.put("radiusMeters", radius);
    search.put("limit", 20);
    return objectMapper.writeValueAsString(search);
  }
}
