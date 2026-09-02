package com.joinly.backend.notifications;

import java.sql.ResultSet;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepository {

  private final JdbcClient jdbc;

  public NotificationRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public void insert(
      NotificationType type, UUID recipientId, UUID eventId, UUID participationId, Instant now) {
    jdbc.sql(
            """
            INSERT INTO notifications
                (recipient_id, event_id, participation_id, type, delivery_status, created_at)
            VALUES (:recipientId, :eventId, :participationId, :type, 'pending', :now)
            """)
        .param("recipientId", recipientId)
        .param("eventId", eventId)
        .param("participationId", participationId)
        .param("type", type.dbValue())
        .param("now", at(now))
        .update();
  }

  public void insertForRecipients(
      NotificationType type, Collection<UUID> recipientIds, UUID eventId, Instant now) {
    for (UUID recipientId : recipientIds) {
      insert(type, recipientId, eventId, null, now);
    }
  }

  /**
   * Locks up to {@code limit} undelivered notifications for the caller's transaction, oldest first,
   * skipping rows another dispatch run already holds so re-runs never double-send.
   */
  public List<Pending> claimPending(int limit) {
    return jdbc.sql(
            """
            SELECT id, recipient_id, event_id, participation_id, type
            FROM notifications
            WHERE delivery_status = 'pending'
            ORDER BY created_at ASC, id ASC
            FOR UPDATE SKIP LOCKED
            LIMIT :limit
            """)
        .param("limit", limit)
        .query(
            (ResultSet rs, int rowNum) ->
                new Pending(
                    rs.getObject("id", UUID.class),
                    rs.getObject("recipient_id", UUID.class),
                    rs.getObject("event_id", UUID.class),
                    rs.getObject("participation_id", UUID.class),
                    NotificationType.fromDbValue(rs.getString("type"))))
        .list();
  }

  public void markSent(UUID id, Instant now) {
    jdbc.sql("UPDATE notifications SET delivery_status = 'sent', sent_at = :now WHERE id = :id")
        .param("now", at(now))
        .param("id", id)
        .update();
  }

  public void markFailed(UUID id) {
    jdbc.sql("UPDATE notifications SET delivery_status = 'failed' WHERE id = :id")
        .param("id", id)
        .update();
  }

  private static OffsetDateTime at(Instant instant) {
    return instant.atOffset(ZoneOffset.UTC);
  }

  public record Pending(
      UUID id, UUID recipientId, UUID eventId, UUID participationId, NotificationType type) {}
}
