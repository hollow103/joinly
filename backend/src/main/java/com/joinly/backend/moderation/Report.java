package com.joinly.backend.moderation;

import java.time.Instant;
import java.util.UUID;

public record Report(
    UUID id,
    UUID reporterId,
    UUID reportedUserId,
    UUID reportedEventId,
    ReportReason reason,
    String description,
    ReportStatus status,
    ModerationAction decisionAction,
    String decisionNote,
    UUID decidedBy,
    Instant decidedAt,
    long version,
    Instant createdAt,
    Instant updatedAt) {

  public ReportTargetType targetType() {
    return reportedUserId == null ? ReportTargetType.EVENT : ReportTargetType.USER;
  }

  public UUID targetId() {
    return reportedUserId == null ? reportedEventId : reportedUserId;
  }
}
