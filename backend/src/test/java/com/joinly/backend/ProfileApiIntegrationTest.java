package com.joinly.backend;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.joinly.backend.authentication.SupabaseAuthClient;
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

/** Hermetic profile lifecycle coverage for GET and PUT /me against real PostGIS. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ProfileApiIntegrationTest {

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
  @Autowired ObjectMapper objectMapper;

  @MockitoBean SupabaseAuthClient supabaseAuth;

  @BeforeEach
  void setUp() {
    when(supabaseAuth.emailVerified(any())).thenReturn(true);
  }

  @Test
  void createsReadsAndUpdatesTheProfileWithOptimisticConcurrency() throws Exception {
    UUID subject = UUID.randomUUID();

    mvc.perform(authored(put("/api/v1/me"), subject).content(profileJson("profileUser", true)))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"profile-0\""))
        .andExpect(jsonPath("$.alias").value("profileUser"))
        .andExpect(jsonPath("$.emailVerified").value(true))
        .andExpect(jsonPath("$.agreementsAccepted").value(true))
        .andExpect(jsonPath("$.manualSearchArea.label").value("Vigo"));

    mvc.perform(authored(get("/api/v1/me"), subject))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"profile-0\""))
        .andExpect(jsonPath("$.alias").value("profileUser"));

    mvc.perform(authored(put("/api/v1/me"), subject).content(profileJson("updatedUser", false)))
        .andExpect(status().isPreconditionRequired())
        .andExpect(jsonPath("$.code").value("if_match_required"));
    mvc.perform(
            authored(put("/api/v1/me"), subject)
                .header(HttpHeaders.IF_MATCH, "\"profile-9\"")
                .content(profileJson("updatedUser", false)))
        .andExpect(status().isPreconditionFailed())
        .andExpect(jsonPath("$.code").value("concurrent_update"));
    mvc.perform(
            authored(put("/api/v1/me"), subject)
                .header(HttpHeaders.IF_MATCH, "\"profile-0\"")
                .content(profileJson("updatedUser", false)))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"profile-1\""))
        .andExpect(jsonPath("$.alias").value("updatedUser"))
        .andExpect(jsonPath("$.manualSearchArea.label").value("Vigo"));
    mvc.perform(
            authored(put("/api/v1/me"), subject)
                .header(HttpHeaders.IF_MATCH, "\"profile-1\"")
                .content(profileJsonWithNullManualArea("updatedUser")))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"profile-2\""))
        .andExpect(jsonPath("$.manualSearchArea").doesNotExist());
  }

  @Test
  void rejectsAProfileThatDoesNotAcceptCurrentAgreementVersions() throws Exception {
    UUID subject = UUID.randomUUID();
    Map<String, Object> profile = profile("profileUser", true);
    profile.put("termsVersion", "v0");

    mvc.perform(
            authored(put("/api/v1/me"), subject).content(objectMapper.writeValueAsString(profile)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("agreement_version_invalid"));
  }

  private MockHttpServletRequestBuilder authored(
      MockHttpServletRequestBuilder builder, UUID subject) {
    return builder.with(jwt().jwt(jwtBuilder(subject))).contentType(MediaType.APPLICATION_JSON);
  }

  private static java.util.function.Consumer<Jwt.Builder> jwtBuilder(UUID subject) {
    return jwt -> jwt.subject(subject.toString()).claim("aud", List.of("authenticated"));
  }

  private String profileJson(String alias, boolean withManualArea) throws Exception {
    return objectMapper.writeValueAsString(profile(alias, withManualArea));
  }

  private String profileJsonWithNullManualArea(String alias) {
    return """
        {"alias":"%s","adultConfirmed":true,"termsVersion":"v1","privacyVersion":"v1","guidelinesVersion":"v1","manualSearchArea":null}
        """
        .formatted(alias);
  }

  private Map<String, Object> profile(String alias, boolean withManualArea) {
    Map<String, Object> profile = new LinkedHashMap<>();
    profile.put("alias", alias);
    profile.put("adultConfirmed", true);
    profile.put("termsVersion", "v1");
    profile.put("privacyVersion", "v1");
    profile.put("guidelinesVersion", "v1");
    profile.put(
        "manualSearchArea",
        withManualArea ? Map.of("longitude", -8.7207, "latitude", 42.2383, "label", "Vigo") : null);
    return profile;
  }
}
