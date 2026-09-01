package com.joinly.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.joinly.backend.authentication.SupabaseAuthClient;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
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
 * Hermetic Phase 2 coverage (B-01..B-03 of docs/14-estrategia-pruebas.md and the main error paths).
 * Real PostGIS via Testcontainers; Supabase is mocked and JWTs are synthetic, so no network is
 * used.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class EventApiIntegrationTest {

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

  private static final double VIGO_LON = -8.7207;
  private static final double VIGO_LAT = 42.2383;

  @BeforeEach
  void resetState() {
    jdbc.update("DELETE FROM events");
    jdbc.update("DELETE FROM users");
    when(supabaseAuth.emailVerified(any())).thenReturn(true);
  }

  @Test
  void createsPublishedEventAndReturnsItAmongOwnEvents() throws Exception {
    UUID creator = insertUser("creatorAlias", true);

    String body =
        mvc.perform(
                authored(post("/api/v1/events"), creator).content(eventJson(VIGO_LON, VIGO_LAT)))
            .andExpect(status().isCreated())
            .andExpect(header().string(HttpHeaders.ETAG, "\"event-0\""))
            .andExpect(jsonPath("$.approximateArea").value("Zona aproximada 42.24, -8.72"))
            .andExpect(
                jsonPath("$.exactLocation.coordinates[0]")
                    .value(org.hamcrest.Matchers.closeTo(VIGO_LON, 1e-6)))
            .andExpect(jsonPath("$.confirmedParticipants").isArray())
            .andExpect(jsonPath("$.creator.alias").value("creatorAlias"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    UUID eventId = UUID.fromString(objectMapper.readTree(body).get("id").asText());

    mvc.perform(authored(get("/api/v1/me/events"), creator))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].id").value(eventId.toString()))
        .andExpect(
            jsonPath("$.items[0].exactLocation.coordinates[1]")
                .value(org.hamcrest.Matchers.closeTo(VIGO_LAT, 1e-6)));
  }

  @Test
  void acceptsAccountDeletionAndRevokesProductAccessImmediately() throws Exception {
    UUID subject = insertUser("deletionUser", true);

    mvc.perform(authored(delete("/api/v1/me"), subject)).andExpect(status().isAccepted());

    assertThat(
            jdbc.queryForObject(
                "SELECT status::text FROM users WHERE auth_subject = ?", String.class, subject))
        .isEqualTo("deletion_requested");
    assertThat(
            jdbc.queryForObject(
                "SELECT deletion_requested_at IS NOT NULL FROM users WHERE auth_subject = ?",
                Boolean.class,
                subject))
        .isTrue();

    mvc.perform(authored(get("/api/v1/me"), subject))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("account_suspended"));
    mvc.perform(authored(delete("/api/v1/me"), subject)).andExpect(status().isAccepted());
  }

  @Test
  void rejectsAFourthActiveEvent() throws Exception {
    UUID creator = insertUser("busyCreator", true);
    for (int i = 0; i < 3; i++) {
      mvc.perform(authored(post("/api/v1/events"), creator).content(eventJson(VIGO_LON, VIGO_LAT)))
          .andExpect(status().isCreated());
    }

    mvc.perform(authored(post("/api/v1/events"), creator).content(eventJson(VIGO_LON, VIGO_LAT)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("active_event_limit_reached"));
  }

  @Test
  void neverExposesExactLocationOrParticipantsToANonParticipant() throws Exception {
    UUID creator = insertUser("host", true);
    UUID viewer = insertUser("passerby", true);
    UUID eventId = createEvent(creator, VIGO_LON, VIGO_LAT);

    mvc.perform(
            authored(post("/api/v1/events/search"), viewer)
                .content(searchJson(VIGO_LON, VIGO_LAT, 5000)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].id").value(eventId.toString()))
        .andExpect(jsonPath("$.items[0].approximateArea").value("Zona aproximada 42.24, -8.72"))
        .andExpect(jsonPath("$.items[0].distanceMeters").isNumber())
        .andExpect(jsonPath("$.items[0].exactLocation").doesNotExist())
        .andExpect(jsonPath("$.items[0].confirmedParticipants").doesNotExist());

    mvc.perform(authored(get("/api/v1/events/" + eventId), viewer))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.exactLocation").doesNotExist())
        .andExpect(jsonPath("$.confirmedParticipants").doesNotExist());

    mvc.perform(authored(get("/api/v1/events/" + eventId), creator))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.exactLocation.coordinates[0]")
                .value(org.hamcrest.Matchers.closeTo(VIGO_LON, 1e-6)))
        .andExpect(jsonPath("$.confirmedParticipants").isArray());
  }

  @Test
  void rejectsAnEventThatStartsInThePast() throws Exception {
    UUID creator = insertUser("timeTraveller", true);
    Map<String, Object> payload = eventMap(VIGO_LON, VIGO_LAT);
    payload.put("startsAt", Instant.now().minus(Duration.ofDays(1)).toString());

    mvc.perform(
            authored(post("/api/v1/events"), creator)
                .content(objectMapper.writeValueAsString(payload)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("validation_error"))
        .andExpect(jsonPath("$.fields.startsAt").value("must be in the future"));
  }

  @Test
  void enforcesTheIfMatchContractOnEdits() throws Exception {
    UUID creator = insertUser("editor", true);
    UUID eventId = createEvent(creator, VIGO_LON, VIGO_LAT);
    String rename = "{\"title\":\"Nuevo titulo\"}";

    mvc.perform(authored(patch("/api/v1/events/" + eventId), creator).content(rename))
        .andExpect(status().isPreconditionRequired())
        .andExpect(jsonPath("$.code").value("if_match_required"));

    mvc.perform(
            authored(patch("/api/v1/events/" + eventId), creator)
                .header(HttpHeaders.IF_MATCH, "\"event-9\"")
                .content(rename))
        .andExpect(status().isPreconditionFailed())
        .andExpect(jsonPath("$.code").value("concurrent_update"));

    mvc.perform(
            authored(patch("/api/v1/events/" + eventId), creator)
                .header(HttpHeaders.IF_MATCH, "\"event-0\"")
                .content(rename))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"event-1\""))
        .andExpect(jsonPath("$.title").value("Nuevo titulo"));
  }

  @Test
  void refusesMainFieldEditsAndCancellationOnceTheEventHasStarted() throws Exception {
    UUID creator = insertUser("latecomer", true);
    UUID eventId = insertStartedEvent(creator);

    mvc.perform(
            authored(patch("/api/v1/events/" + eventId), creator)
                .header(HttpHeaders.IF_MATCH, "\"event-0\"")
                .content("{\"title\":\"Otro titulo\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("event_not_editable"));

    mvc.perform(
            authored(post("/api/v1/events/" + eventId + "/cancellation"), creator).content("{}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("event_not_cancellable"));
  }

  @Test
  void cancellationRemovesTheEventFromDiscoveryAndDetail() throws Exception {
    UUID creator = insertUser("quitter", true);
    UUID viewer = insertUser("seeker", true);
    UUID eventId = createEvent(creator, VIGO_LON, VIGO_LAT);

    mvc.perform(
            authored(post("/api/v1/events/" + eventId + "/cancellation"), creator).content("{}"))
        .andExpect(status().isNoContent());

    mvc.perform(
            authored(post("/api/v1/events/search"), viewer)
                .content(searchJson(VIGO_LON, VIGO_LAT, 5000)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isEmpty());

    mvc.perform(authored(get("/api/v1/events/" + eventId), viewer))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("not_found"));
  }

  @Test
  void keepsPrivateInvitationEventsOutOfDiscoveryAndOtherUsersDetail() throws Exception {
    UUID creator = insertUser("privateHost", true);
    UUID viewer = insertUser("outsider", true);
    Map<String, Object> payload = eventMap(VIGO_LON, VIGO_LAT);
    payload.put("accessMode", "privateInvitation");
    String eventId =
        objectMapper
            .readTree(
                mvc.perform(
                        authored(post("/api/v1/events"), creator)
                            .content(objectMapper.writeValueAsString(payload)))
                    .andExpect(status().isCreated())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .get("id")
            .asText();

    mvc.perform(
            authored(post("/api/v1/events/search"), viewer)
                .content(searchJson(VIGO_LON, VIGO_LAT, 5000)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isEmpty());

    mvc.perform(authored(get("/api/v1/events/" + eventId), viewer))
        .andExpect(status().isNotFound());
    mvc.perform(authored(get("/api/v1/events/" + eventId), creator)).andExpect(status().isOk());
  }

  @Test
  void refusesEventCreationWhenTheEmailIsNotVerified() throws Exception {
    UUID creator = insertUser("unverified", false);
    when(supabaseAuth.emailVerified(any())).thenReturn(false);

    mvc.perform(authored(post("/api/v1/events"), creator).content(eventJson(VIGO_LON, VIGO_LAT)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("email_not_verified"));
  }

  @Test
  void suggestsAWiderRadiusWhenNothingMatches() throws Exception {
    UUID viewer = insertUser("lonelySeeker", true);

    mvc.perform(authored(post("/api/v1/events/search"), viewer).content(searchJson(0.0, 0.0, 1000)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isEmpty())
        .andExpect(jsonPath("$.suggestedRadiusMeters").value(2000));
  }

  @Test
  void paginatesDiscoveryByAStableCursor() throws Exception {
    UUID creator = insertUser("prolific", true);
    createEvent(creator, VIGO_LON, VIGO_LAT);
    createEvent(creator, VIGO_LON + 0.01, VIGO_LAT);
    createEvent(creator, VIGO_LON + 0.02, VIGO_LAT);
    UUID viewer = insertUser("browser", true);

    JsonNode firstPage =
        objectMapper.readTree(
            mvc.perform(
                    authored(post("/api/v1/events/search"), viewer)
                        .content(searchJson(VIGO_LON, VIGO_LAT, 10000, 2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.page.nextCursor").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString());
    String cursor = firstPage.get("page").get("nextCursor").asText();
    String firstIds =
        firstPage.get("items").get(0).get("id").asText()
            + ","
            + firstPage.get("items").get(1).get("id").asText();

    mvc.perform(
            authored(post("/api/v1/events/search"), viewer)
                .content(searchJsonWithCursor(VIGO_LON, VIGO_LAT, 10000, 2, cursor)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items.length()").value(1))
        .andExpect(jsonPath("$.page.nextCursor").doesNotExist())
        .andExpect(
            jsonPath("$.items[0].id")
                .value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.in(firstIds.split(",")))));
  }

  // --- helpers -------------------------------------------------------------

  private MockHttpServletRequestBuilder authored(
      MockHttpServletRequestBuilder builder, UUID subject) {
    return builder.with(jwt().jwt(jwtBuilder(subject))).contentType(MediaType.APPLICATION_JSON);
  }

  private static java.util.function.Consumer<Jwt.Builder> jwtBuilder(UUID subject) {
    return jwt -> jwt.subject(subject.toString()).claim("aud", List.of("authenticated"));
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

  private UUID createEvent(UUID creatorSubject, double lon, double lat) throws Exception {
    String body =
        mvc.perform(authored(post("/api/v1/events"), creatorSubject).content(eventJson(lon, lat)))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(objectMapper.readTree(body).get("id").asText());
  }

  private UUID insertStartedEvent(UUID creatorSubject) {
    return jdbc.queryForObject(
        """
        INSERT INTO events (creator_id, title, description, category, starts_at, duration_minutes,
            location, approximate_area, access_mode, status)
        SELECT u.id, 'Evento pasado', 'Descripcion', 'sport_wellbeing',
               now() - interval '2 hours', 60,
               ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, 'Zona aproximada', 'direct', 'published'
        FROM users u WHERE u.auth_subject = ?
        RETURNING id
        """,
        UUID.class,
        VIGO_LON,
        VIGO_LAT,
        creatorSubject);
  }

  private String eventJson(double lon, double lat) throws Exception {
    return objectMapper.writeValueAsString(eventMap(lon, lat));
  }

  private Map<String, Object> eventMap(double lon, double lat) {
    Map<String, Object> event = new LinkedHashMap<>();
    event.put("title", "Ruta por el Castro");
    event.put("description", "Paseo tranquilo al atardecer.");
    event.put("category", "sportWellbeing");
    event.put("startsAt", Instant.now().plus(Duration.ofDays(7)).toString());
    event.put("durationMinutes", 120);
    event.put("exactLocation", Map.of("type", "Point", "coordinates", List.of(lon, lat)));
    event.put("accessMode", "direct");
    event.put("capacity", 12);
    return event;
  }

  private String searchJson(double lon, double lat, int radius) throws Exception {
    return searchJsonWithCursor(lon, lat, radius, 20, null);
  }

  private String searchJson(double lon, double lat, int radius, int limit) throws Exception {
    return searchJsonWithCursor(lon, lat, radius, limit, null);
  }

  private String searchJsonWithCursor(double lon, double lat, int radius, int limit, String cursor)
      throws Exception {
    Map<String, Object> search = new LinkedHashMap<>();
    search.put("origin", Map.of("type", "Point", "coordinates", List.of(lon, lat)));
    search.put("radiusMeters", radius);
    search.put("limit", limit);
    if (cursor != null) {
      search.put("cursor", cursor);
    }
    return objectMapper.writeValueAsString(search);
  }
}
