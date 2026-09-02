package com.joinly.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.joinly.backend.authentication.SupabaseAuthClient;
import com.joinly.backend.notifications.ExpoPushClient;
import com.joinly.backend.notifications.NotificationDispatchService;
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
 * Hermetic coverage for notification delivery (B-14 of docs/14-estrategia-pruebas.md): use cases
 * record notifications inside their own transaction, and the scheduled dispatcher sends them once
 * through Expo, honouring per-type preferences and pruning unregistered tokens. Real PostGIS via
 * Testcontainers; Supabase and the Expo client are mocked so no network is used and the scheduler
 * trigger is disabled ({@code joinly.notifications.dispatch-cron=-}).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class NotificationDeliveryIntegrationTest {

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
  @Autowired NotificationDispatchService dispatch;

  @MockitoBean SupabaseAuthClient supabaseAuth;
  @MockitoBean ExpoPushClient expo;

  private static final double LON = -8.7207;
  private static final double LAT = 42.2383;

  @BeforeEach
  void resetState() {
    jdbc.update("DELETE FROM notifications");
    jdbc.update("DELETE FROM idempotency_records");
    jdbc.update("DELETE FROM participations");
    jdbc.update("DELETE FROM invitations");
    jdbc.update("DELETE FROM blocks");
    jdbc.update("DELETE FROM push_devices");
    jdbc.update("DELETE FROM events");
    jdbc.update("DELETE FROM users");
    when(supabaseAuth.emailVerified(any())).thenReturn(true);
    when(expo.send(any(), any(), any(), any())).thenReturn(ExpoPushClient.Result.OK);
  }

  @Test
  void recordsAndDeliversAJoinRequestToTheCreator() throws Exception {
    UUID creator = insertUser("notifHost", true);
    UUID requester = insertUser("notifAsker", true);
    registerDevice(creator, "ExponentPushToken[creator]", true, allPreferences());
    UUID eventId = createEvent(creator, "approval", 5);

    join(requester, eventId, "req-1", null).andExpect(status().isCreated());

    assertThat(countPending("participation_requested", userId(creator))).isEqualTo(1);

    dispatch.dispatchDue();

    verify(expo).send(eq("ExponentPushToken[creator]"), any(), any(), any());
    assertThat(deliveryStatus("participation_requested", userId(creator))).isEqualTo("sent");
  }

  @Test
  void recordsApprovalAndRejectionForTheRequester() throws Exception {
    UUID creator = insertUser("decisionHost", true);
    UUID approved = insertUser("approvedAsker", true);
    UUID rejected = insertUser("rejectedAsker", true);
    registerDevice(approved, "ExponentPushToken[approved]", true, allPreferences());
    registerDevice(rejected, "ExponentPushToken[rejected]", true, allPreferences());
    UUID eventId = createEvent(creator, "approval", 5);

    join(approved, eventId, "a-1", null).andExpect(status().isCreated());
    join(rejected, eventId, "r-1", null).andExpect(status().isCreated());
    UUID approvedRequest = pendingParticipationId(eventId, creator, 0);
    UUID rejectedRequest = pendingParticipationId(eventId, creator, 1);

    resolve(eventId, approvedRequest, creator, "confirmed").andExpect(status().isOk());
    resolve(eventId, rejectedRequest, creator, "rejected").andExpect(status().isOk());

    assertThat(countPending("participation_approved", userId(approved))).isEqualTo(1);
    assertThat(countPending("participation_rejected", userId(rejected))).isEqualTo(1);

    dispatch.dispatchDue();

    assertThat(deliveryStatus("participation_approved", userId(approved))).isEqualTo("sent");
    assertThat(deliveryStatus("participation_rejected", userId(rejected))).isEqualTo("sent");
  }

  @Test
  void notifiesConfirmedParticipantsOnEventChangeAndCancellation() throws Exception {
    UUID creator = insertUser("changeHost", true);
    UUID participant = insertUser("changeGuest", true);
    UUID pending = insertUser("pendingGuest", true);
    registerDevice(participant, "ExponentPushToken[guest]", true, allPreferences());
    UUID eventId = createEvent(creator, "direct", 5);
    join(participant, eventId, "c-1", null)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("confirmed"));

    mvc.perform(
            authored(patch("/api/v1/events/" + eventId), creator)
                .header(HttpHeaders.IF_MATCH, "\"event-0\"")
                .content("{\"title\":\"Ruta renombrada\"}"))
        .andExpect(status().isOk());

    mvc.perform(
            authored(post("/api/v1/events/" + eventId + "/cancellation"), creator).content("{}"))
        .andExpect(status().isNoContent());

    assertThat(countPending("event_changed", userId(participant))).isEqualTo(1);
    assertThat(countPending("event_cancelled", userId(participant))).isEqualTo(1);
    assertThat(totalFor(userId(pending))).isZero();

    dispatch.dispatchDue();

    assertThat(deliveryStatus("event_changed", userId(participant))).isEqualTo("sent");
    assertThat(deliveryStatus("event_cancelled", userId(participant))).isEqualTo("sent");
  }

  @Test
  void directJoinDoesNotNotifyTheCreator() throws Exception {
    UUID creator = insertUser("directHost", true);
    UUID joiner = insertUser("directGuest", true);
    UUID eventId = createEvent(creator, "direct", 5);

    join(joiner, eventId, "d-1", null)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("confirmed"));

    assertThat(totalFor(userId(creator))).isZero();
  }

  @Test
  void skipsDeliveryWhenTheTypeIsMutedOrPushIsDisabled() throws Exception {
    UUID creator = insertUser("muteHost", true);
    UUID muted = insertUser("mutedAsker", true);
    UUID disabled = insertUser("disabledAsker", true);
    Map<String, Boolean> onlyChanges = allPreferences();
    onlyChanges.put("requests", false);
    registerDevice(creator, "ExponentPushToken[creator]", true, onlyChanges);
    UUID eventId = createEvent(creator, "approval", 5);

    join(muted, eventId, "m-1", null).andExpect(status().isCreated());
    dispatch.dispatchDue();

    verify(expo, never()).send(any(), any(), any(), any());
    assertThat(deliveryStatus("participation_requested", userId(creator))).isEqualTo("sent");
  }

  @Test
  void prunesTheTokenWhenExpoReportsDeviceNotRegistered() throws Exception {
    UUID creator = insertUser("staleHost", true);
    UUID requester = insertUser("staleAsker", true);
    registerDevice(creator, "ExponentPushToken[stale]", true, allPreferences());
    when(expo.send(any(), any(), any(), any()))
        .thenReturn(ExpoPushClient.Result.DEVICE_NOT_REGISTERED);
    UUID eventId = createEvent(creator, "approval", 5);

    join(requester, eventId, "s-1", null).andExpect(status().isCreated());
    dispatch.dispatchDue();

    assertThat(deliveryStatus("participation_requested", userId(creator))).isEqualTo("failed");
    assertThat(
            jdbc.queryForObject(
                "SELECT expo_push_token FROM push_devices WHERE user_id = ?",
                String.class,
                userId(creator)))
        .isNull();
  }

  @Test
  void dispatchIsIdempotentAndLeavesNothingPending() throws Exception {
    UUID creator = insertUser("idemHost", true);
    UUID requester = insertUser("idemAsker", true);
    registerDevice(creator, "ExponentPushToken[idem]", true, allPreferences());
    UUID eventId = createEvent(creator, "approval", 5);
    join(requester, eventId, "i-1", null).andExpect(status().isCreated());

    dispatch.dispatchDue();
    dispatch.dispatchDue();

    verify(expo).send(any(), any(), any(), any());
    assertThat(jdbc.queryForObject("SELECT count(*) FROM notifications", Integer.class))
        .isEqualTo(1);
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM notifications WHERE delivery_status = 'pending'",
                Integer.class))
        .isZero();
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

  private UUID userId(UUID authSubject) {
    return jdbc.queryForObject(
        "SELECT id FROM users WHERE auth_subject = ?", UUID.class, authSubject);
  }

  private static Map<String, Boolean> allPreferences() {
    Map<String, Boolean> preferences = new LinkedHashMap<>();
    preferences.put("requests", true);
    preferences.put("decisions", true);
    preferences.put("changes", true);
    preferences.put("cancellations", true);
    return preferences;
  }

  private void registerDevice(
      UUID subject, String token, boolean enabled, Map<String, Boolean> preferences)
      throws Exception {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("enabled", enabled);
    body.put("expoPushToken", token);
    body.put("preferences", preferences);
    mvc.perform(
            authored(put("/api/v1/me/push-settings"), subject)
                .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isOk());
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

  private org.springframework.test.web.servlet.ResultActions join(
      UUID subject, UUID eventId, String idempotencyKey, String invitationCode) throws Exception {
    MockHttpServletRequestBuilder builder =
        authored(post("/api/v1/events/" + eventId + "/participations"), subject)
            .header("Idempotency-Key", idempotencyKey)
            .content(
                invitationCode == null ? "{}" : "{\"invitationCode\":\"" + invitationCode + "\"}");
    return mvc.perform(builder);
  }

  private org.springframework.test.web.servlet.ResultActions resolve(
      UUID eventId, UUID participationId, UUID creator, String targetStatus) throws Exception {
    return mvc.perform(
        authored(patch("/api/v1/events/" + eventId + "/participations/" + participationId), creator)
            .header(HttpHeaders.IF_MATCH, "\"participation-0\"")
            .content("{\"status\":\"" + targetStatus + "\"}"));
  }

  private UUID pendingParticipationId(UUID eventId, UUID creator, int index) throws Exception {
    String body =
        mvc.perform(
                authored(
                    get("/api/v1/events/" + eventId + "/participations?status=pending"), creator))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return UUID.fromString(
        objectMapper.readTree(body).get("items").get(index).get("participationId").asText());
  }

  private Integer countPending(String type, UUID recipientId) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM notifications WHERE type = ? AND recipient_id = ? "
            + "AND delivery_status = 'pending'",
        Integer.class,
        type,
        recipientId);
  }

  private Integer totalFor(UUID recipientId) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM notifications WHERE recipient_id = ?", Integer.class, recipientId);
  }

  private String deliveryStatus(String type, UUID recipientId) {
    return jdbc.queryForObject(
        "SELECT delivery_status FROM notifications WHERE type = ? AND recipient_id = ?",
        String.class,
        type,
        recipientId);
  }
}
