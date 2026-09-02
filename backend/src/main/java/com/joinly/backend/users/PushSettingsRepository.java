package com.joinly.backend.users;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class PushSettingsRepository {

  private final JdbcClient jdbc;
  private final ObjectMapper objectMapper;

  public PushSettingsRepository(JdbcClient jdbc, ObjectMapper objectMapper) {
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
  }

  public PushSettingsService.Settings upsert(
      UUID userId, boolean enabled, String token, String preferences, Instant now) {
    return jdbc.sql(
            """
            INSERT INTO push_devices (user_id, expo_push_token, enabled, preferences, created_at, updated_at)
            VALUES (:userId, :token, :enabled, CAST(:preferences AS jsonb), :now, :now)
            ON CONFLICT (user_id) DO UPDATE
            SET expo_push_token = COALESCE(EXCLUDED.expo_push_token, push_devices.expo_push_token),
                enabled = EXCLUDED.enabled, preferences = EXCLUDED.preferences, updated_at = EXCLUDED.updated_at
            RETURNING enabled, expo_push_token, preferences::text
            """)
        .param("userId", userId)
        .param("token", token)
        .param("enabled", enabled)
        .param("preferences", preferences)
        .param("now", now.atOffset(ZoneOffset.UTC))
        .query(
            (rs, rowNum) ->
                new PushSettingsService.Settings(
                    rs.getBoolean("enabled"),
                    rs.getString("expo_push_token"),
                    readPreferences(rs.getString("preferences"))))
        .single();
  }

  public Optional<PushSettingsService.Settings> findByUser(UUID userId) {
    return jdbc.sql(
            """
            SELECT enabled, expo_push_token, preferences::text AS preferences
            FROM push_devices WHERE user_id = :userId
            """)
        .param("userId", userId)
        .query(
            (rs, rowNum) ->
                new PushSettingsService.Settings(
                    rs.getBoolean("enabled"),
                    rs.getString("expo_push_token"),
                    readPreferences(rs.getString("preferences"))))
        .optional();
  }

  /** Clears a token Expo rejected as unregistered; keeps the row and its preferences. */
  public void clearToken(UUID userId, String expoPushToken) {
    jdbc.sql(
            """
            UPDATE push_devices SET expo_push_token = NULL, updated_at = now()
            WHERE user_id = :userId AND expo_push_token = :token
            """)
        .param("userId", userId)
        .param("token", expoPushToken)
        .update();
  }

  private Map<String, Boolean> readPreferences(String value) {
    try {
      return objectMapper.readValue(value, new TypeReference<>() {});
    } catch (Exception exception) {
      throw new IllegalStateException("Stored push settings are invalid.", exception);
    }
  }
}
