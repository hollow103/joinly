package com.joinly.backend.participation;

import java.time.Instant;
import java.util.UUID;

public record Participation(
    UUID id,
    UUID eventId,
    UUID userId,
    ParticipationStatus status,
    Instant requestedAt,
    Instant resolvedAt,
    Instant abandonedAt,
    long version,
    Instant createdAt,
    Instant updatedAt) {}
