package com.joinly.backend.moderation;

import com.joinly.backend.shared.KeysetCursor;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ModerationRepository {

  private static final String COLUMNS =
      "id, reporter_id, reported_user_id, reported_event_id, reason::text AS reason, description, "
          + "status::text AS status, decision_action::text AS decision_action, decision_note, "
          + "decided_by, decided_at, version, created_at, updated_at";

  private final JdbcClient jdbc;

  public ModerationRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public boolean userIsVisibleTo(UUID reporterId, UUID targetId, Instant now) {
    return Boolean.TRUE.equals(
        jdbc.sql(
                """
                SELECT EXISTS (
                    SELECT 1 FROM users target
                    WHERE target.id = :targetId
                      AND target.id <> :reporterId
                      AND EXISTS (
                          SELECT 1 FROM events event
                          WHERE event.creator_id = target.id
                            AND event.status = 'published' AND NOT event.is_hidden
                            AND event.starts_at > :now
                            AND event.access_mode <> 'private_invitation'
                      )
                      AND NOT EXISTS (
                          SELECT 1 FROM blocks
                          WHERE (blocker_id = :reporterId AND blocked_id = target.id)
                             OR (blocker_id = target.id AND blocked_id = :reporterId)
                      )
                )
                """)
            .param("targetId", targetId)
            .param("reporterId", reporterId)
            .param("now", ts(now))
            .query(Boolean.class)
            .single());
  }

  public Report insert(NewReport report, Instant now) {
    UUID id =
        jdbc.sql(
                """
                INSERT INTO reports (
                    reporter_id, reported_user_id, reported_event_id, reason, description,
                    status, version, created_at, updated_at
                ) VALUES (
                    :reporterId, :reportedUserId, :reportedEventId, :reason::report_reason,
                    :description, 'pending', 0, :now, :now
                ) RETURNING id
                """)
            .param("reporterId", report.reporterId())
            .param("reportedUserId", report.reportedUserId())
            .param("reportedEventId", report.reportedEventId())
            .param("reason", report.reason().dbValue())
            .param("description", report.description())
            .param("now", ts(now))
            .query(UUID.class)
            .single();
    return findById(id).orElseThrow();
  }

  public Optional<Report> findById(UUID id) {
    return jdbc.sql("SELECT " + COLUMNS + " FROM reports WHERE id = :id")
        .param("id", id)
        .query(this::map)
        .optional();
  }

  public List<Report> findPage(ReportStatus status, KeysetCursor cursor, int limit) {
    StringBuilder sql =
        new StringBuilder("SELECT ").append(COLUMNS).append(" FROM reports WHERE 1 = 1");
    if (status != null) {
      sql.append(" AND status = :status::report_status");
    }
    if (cursor != null) {
      sql.append(" AND (created_at, id) < (:cursorCreatedAt, :cursorId)");
    }
    sql.append(" ORDER BY created_at DESC, id DESC LIMIT :limit");

    var spec = jdbc.sql(sql.toString()).param("limit", limit);
    if (status != null) {
      spec = spec.param("status", status.value());
    }
    if (cursor != null) {
      spec = spec.param("cursorCreatedAt", ts(cursor.timestamp())).param("cursorId", cursor.id());
    }
    return spec.query(this::map).list();
  }

  public Optional<Report> decide(
      UUID id,
      long expectedVersion,
      ReportStatus status,
      ModerationAction action,
      String note,
      UUID adminId,
      Instant now) {
    return jdbc.sql(
            """
            UPDATE reports
            SET status = :status::report_status,
                decision_action = :action::moderation_action,
                decision_note = :note,
                decided_by = :adminId,
                decided_at = :now,
                version = version + 1,
                updated_at = :now
            WHERE id = :id AND version = :expectedVersion AND status = 'pending'
            RETURNING id
            """)
        .param("id", id)
        .param("expectedVersion", expectedVersion)
        .param("status", status.value())
        .param("action", action.dbValue())
        .param("note", note)
        .param("adminId", adminId)
        .param("now", ts(now))
        .query(UUID.class)
        .optional()
        .flatMap(this::findById);
  }

  public void audit(
      UUID reportId, UUID actorId, String action, String fieldsAccessed, String note, Instant now) {
    jdbc.sql(
            """
            INSERT INTO moderation_audit (report_id, actor_id, action, fields_accessed, note, created_at)
            VALUES (:reportId, :actorId, :action, CAST(:fieldsAccessed AS jsonb), :note, :now)
            """)
        .param("reportId", reportId)
        .param("actorId", actorId)
        .param("action", action)
        .param("fieldsAccessed", fieldsAccessed)
        .param("note", note)
        .param("now", ts(now))
        .update();
  }

  public void hideEvent(UUID eventId, Instant now) {
    jdbc.sql(
            """
            UPDATE events
            SET is_hidden = true, version = version + 1, updated_at = :now
            WHERE id = :eventId AND status = 'published'
            """)
        .param("eventId", eventId)
        .param("now", ts(now))
        .update();
  }

  public void suspendUser(UUID userId, Instant now) {
    jdbc.sql(
            """
            UPDATE users
            SET status = 'suspended', version = version + 1, updated_at = :now
            WHERE id = :userId AND status = 'active'
            """)
        .param("userId", userId)
        .param("now", ts(now))
        .update();
    jdbc.sql(
            """
            UPDATE events
            SET is_hidden = true, version = version + 1, updated_at = :now
            WHERE creator_id = :userId AND status = 'published' AND NOT is_hidden
            """)
        .param("userId", userId)
        .param("now", ts(now))
        .update();
  }

  private Report map(ResultSet rs, int rowNum) throws SQLException {
    return new Report(
        rs.getObject("id", UUID.class),
        rs.getObject("reporter_id", UUID.class),
        rs.getObject("reported_user_id", UUID.class),
        rs.getObject("reported_event_id", UUID.class),
        ReportReason.fromDb(rs.getString("reason")),
        rs.getString("description"),
        ReportStatus.fromDb(rs.getString("status")),
        rs.getString("decision_action") == null
            ? null
            : ModerationAction.fromDb(rs.getString("decision_action")),
        rs.getString("decision_note"),
        rs.getObject("decided_by", UUID.class),
        rs.getTimestamp("decided_at") == null ? null : rs.getTimestamp("decided_at").toInstant(),
        rs.getLong("version"),
        rs.getTimestamp("created_at").toInstant(),
        rs.getTimestamp("updated_at").toInstant());
  }

  public record NewReport(
      UUID reporterId,
      UUID reportedUserId,
      UUID reportedEventId,
      ReportReason reason,
      String description) {}

  private static OffsetDateTime ts(Instant instant) {
    return instant.atOffset(ZoneOffset.UTC);
  }
}
