package com.joinly.backend.participation;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class IdempotencyRepository {

  private final JdbcClient jdbc;

  public IdempotencyRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /** Non-expired record for this (user, operation, key), if any. */
  public Optional<Record> find(UUID userId, String operation, String key, Instant now) {
    return jdbc.sql(
            """
            SELECT request_hash, resource_id FROM idempotency_records
            WHERE user_id = :userId AND operation = :operation AND idempotency_key = :key
              AND expires_at > :now
            """)
        .param("userId", userId)
        .param("operation", operation)
        .param("key", key)
        .param("now", ts(now))
        .query(
            (rs, rowNum) ->
                new Record(rs.getString("request_hash"), rs.getObject("resource_id", UUID.class)))
        .optional();
  }

  public void save(
      UUID userId,
      String operation,
      String key,
      String requestHash,
      UUID resourceId,
      Instant now,
      Instant expiresAt) {
    jdbc.sql(
            """
            DELETE FROM idempotency_records
            WHERE user_id = :userId AND operation = :operation AND idempotency_key = :key
              AND expires_at <= :now
            """)
        .param("userId", userId)
        .param("operation", operation)
        .param("key", key)
        .param("now", ts(now))
        .update();
    jdbc.sql(
            """
            INSERT INTO idempotency_records (
                user_id, operation, idempotency_key, request_hash, resource_id, created_at, expires_at
            ) VALUES (:userId, :operation, :key, :requestHash, :resourceId, :now, :expiresAt)
            ON CONFLICT (user_id, operation, idempotency_key) DO NOTHING
            """)
        .param("userId", userId)
        .param("operation", operation)
        .param("key", key)
        .param("requestHash", requestHash)
        .param("resourceId", resourceId)
        .param("now", ts(now))
        .param("expiresAt", ts(expiresAt))
        .update();
  }

  private static OffsetDateTime ts(Instant instant) {
    return instant.atOffset(ZoneOffset.UTC);
  }

  public record Record(String requestHash, UUID resourceId) {}
}
