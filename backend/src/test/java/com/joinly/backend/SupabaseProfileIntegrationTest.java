package com.joinly.backend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@EnabledIfEnvironmentVariable(named = "SUPABASE_TEST_ACCESS_TOKEN", matches = ".+")
class SupabaseProfileIntegrationTest {

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

  @Test
  void validatesARealSupabaseTokenAndEnforcesTheProfileLifecycle() throws Exception {
    String token = System.getenv("SUPABASE_TEST_ACCESS_TOKEN");
    String authorization = "Bearer " + token;
    String profile =
        objectMapper.writeValueAsString(
            Map.of(
                "alias",
                "joinlyTestUser",
                "adultConfirmed",
                true,
                "termsVersion",
                "v1",
                "privacyVersion",
                "v1",
                "guidelinesVersion",
                "v1",
                "manualSearchArea",
                Map.of("longitude", -8.7207, "latitude", 42.2383, "label", "Vigo")));

    mvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, authorization))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("profile_required"));

    String createResponse =
        mvc.perform(
                put("/api/v1/me")
                    .header(HttpHeaders.AUTHORIZATION, authorization)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(profile))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.ETAG, "\"profile-0\""))
            .andExpect(jsonPath("$.manualSearchArea.label").value("Vigo"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode created = objectMapper.readTree(createResponse);

    mvc.perform(
            put("/api/v1/me")
                .header(HttpHeaders.AUTHORIZATION, authorization)
                .contentType(MediaType.APPLICATION_JSON)
                .content(profile))
        .andExpect(status().isPreconditionRequired())
        .andExpect(jsonPath("$.code").value("if_match_required"));

    mvc.perform(
            put("/api/v1/me")
                .header(HttpHeaders.AUTHORIZATION, authorization)
                .header(HttpHeaders.IF_MATCH, "\"profile-0\"")
                .contentType(MediaType.APPLICATION_JSON)
                .content(profile))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"profile-1\""));

    jdbc.update(
        "UPDATE users SET status = 'suspended' WHERE id = ?",
        UUID.fromString(created.get("id").asText()));

    mvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, authorization))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("account_suspended"));

    mvc.perform(
            put("/api/v1/me")
                .header(HttpHeaders.AUTHORIZATION, authorization)
                .header(HttpHeaders.IF_MATCH, "\"profile-1\"")
                .contentType(MediaType.APPLICATION_JSON)
                .content(profile))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("account_suspended"));

    mvc.perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, "Bearer invalid"))
        .andExpect(status().isUnauthorized());
  }
}
