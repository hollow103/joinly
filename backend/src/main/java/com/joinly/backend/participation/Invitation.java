package com.joinly.backend.participation;

import java.time.Instant;
import java.util.UUID;

public record Invitation(
    UUID id,
    UUID eventId,
    UUID createdBy,
    Integer maxUses,
    int usedCount,
    Instant expiresAt,
    Instant revokedAt,
    Instant createdAt,
    Instant updatedAt) {

  public boolean usable(Instant now) {
    return revokedAt == null
        && (expiresAt == null || expiresAt.isAfter(now))
        && (maxUses == null || usedCount < maxUses);
  }
}
