package com.joinly.backend.events;

import java.time.Instant;
import java.util.UUID;

/**
 * Internal domain view of an event. {@code creatorAlias} is denormalised from the {@code users}
 * join so projections do not need a second query; the exact {@code longitude}/{@code latitude} are
 * only ever exposed through {@link EventVisibility}.
 */
public record Event(
    UUID id,
    UUID creatorId,
    String creatorAlias,
    String title,
    String description,
    String notes,
    EventCategory category,
    Instant startsAt,
    int durationMinutes,
    double longitude,
    double latitude,
    String approximateArea,
    Integer capacity,
    AccessMode accessMode,
    String status,
    boolean hidden,
    long version,
    Instant createdAt,
    Instant updatedAt,
    Instant cancelledAt) {

  public Instant endsAt() {
    return startsAt.plusSeconds((long) durationMinutes * 60);
  }

  public boolean startsInTheFuture(Instant now) {
    return startsAt.isAfter(now);
  }

  public boolean hasEnded(Instant now) {
    return !now.isBefore(endsAt());
  }

  public boolean isPublished() {
    return "published".equals(status);
  }
}
