package com.joinly.backend.participation;

import com.joinly.backend.shared.BusinessException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Backs the {@code Idempotency-Key} contract for participation creation: the same key + user + body
 * returns the original result for 24 hours; the same key with a different body is a {@code 409}.
 */
@Service
public class IdempotencyService {

  private static final String OPERATION = "create_participation";
  private static final Duration TTL = Duration.ofHours(24);

  private final IdempotencyRepository records;

  public IdempotencyService(IdempotencyRepository records) {
    this.records = records;
  }

  public String requestHash(UUID eventId, String invitationCode) {
    return sha256(eventId + "|" + (invitationCode == null ? "" : invitationCode));
  }

  /** The already-created participation id for a replayed request, or empty to proceed. */
  public Optional<UUID> replay(UUID userId, String key, String requestHash, Instant now) {
    return records
        .find(userId, OPERATION, key, now)
        .map(
            record -> {
              if (!record.requestHash().equals(requestHash)) {
                throw new BusinessException(
                    HttpStatus.CONFLICT,
                    "idempotency_key_conflict",
                    "This Idempotency-Key was already used with a different request.");
              }
              return record.resourceId();
            });
  }

  public void record(
      UUID userId, String key, String requestHash, UUID participationId, Instant now) {
    records.save(userId, OPERATION, key, requestHash, participationId, now, now.plus(TTL));
  }

  private static String sha256(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is required", exception);
    }
  }
}
