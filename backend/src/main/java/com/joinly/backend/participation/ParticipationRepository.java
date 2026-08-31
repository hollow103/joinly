package com.joinly.backend.participation;

import com.joinly.backend.shared.PublicProfile;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ParticipationRepository {

  private static final String SELECT =
      """
      SELECT id, event_id, user_id, status::text AS status, requested_at, resolved_at,
             abandoned_at, version, created_at, updated_at
      FROM participations
      """;

  private final JdbcClient jdbc;

  public ParticipationRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<Participation> findById(UUID id) {
    return jdbc.sql(SELECT + " WHERE id = :id").param("id", id).query(this::map).optional();
  }

  public Optional<Participation> findByEventAndUser(UUID eventId, UUID userId) {
    return jdbc.sql(SELECT + " WHERE event_id = :eventId AND user_id = :userId")
        .param("eventId", eventId)
        .param("userId", userId)
        .query(this::map)
        .optional();
  }

  public int countConfirmed(UUID eventId) {
    return jdbc.sql(
            "SELECT count(*) FROM participations WHERE event_id = :eventId AND status = 'confirmed'")
        .param("eventId", eventId)
        .query(Integer.class)
        .single();
  }

  public Map<UUID, Integer> countConfirmedByEvents(Collection<UUID> eventIds) {
    Map<UUID, Integer> counts = new HashMap<>();
    if (eventIds.isEmpty()) {
      return counts;
    }
    jdbc.sql(
            """
            SELECT event_id, count(*) AS n FROM participations
            WHERE status = 'confirmed' AND event_id IN (:eventIds)
            GROUP BY event_id
            """)
        .param("eventIds", eventIds)
        .query(
            (ResultSet rs, int rowNum) -> {
              counts.put(rs.getObject("event_id", UUID.class), rs.getInt("n"));
              return null;
            })
        .list();
    return counts;
  }

  public boolean isConfirmed(UUID userId, UUID eventId) {
    return Boolean.TRUE.equals(
        jdbc.sql(
                """
                SELECT EXISTS (SELECT 1 FROM participations
                    WHERE user_id = :userId AND event_id = :eventId AND status = 'confirmed')
                """)
            .param("userId", userId)
            .param("eventId", eventId)
            .query(Boolean.class)
            .single());
  }

  public Optional<String> statusOf(UUID userId, UUID eventId) {
    return jdbc.sql(
            "SELECT status::text FROM participations WHERE user_id = :userId AND event_id = :eventId")
        .param("userId", userId)
        .param("eventId", eventId)
        .query(String.class)
        .optional();
  }

  public List<PublicProfile> confirmedProfiles(UUID eventId) {
    return jdbc.sql(
            """
            SELECT u.id, u.alias
            FROM participations p JOIN users u ON u.id = p.user_id
            WHERE p.event_id = :eventId AND p.status = 'confirmed'
            ORDER BY p.resolved_at ASC, p.id ASC
            """)
        .param("eventId", eventId)
        .query(
            (ResultSet rs, int rowNum) ->
                new PublicProfile(rs.getObject("id", UUID.class), rs.getString("alias")))
        .list();
  }

  /**
   * Participants of an event in a given status for the creator's paginated listing, keyset by
   * {@code (requested_at, id)}.
   */
  public List<ParticipantRow> listByStatus(
      UUID eventId,
      ParticipationStatus status,
      Instant cursorRequestedAt,
      UUID cursorId,
      int limit) {
    StringBuilder sql =
        new StringBuilder(
            """
            SELECT p.id, u.id AS user_id, u.alias, p.requested_at
            FROM participations p JOIN users u ON u.id = p.user_id
            WHERE p.event_id = :eventId AND p.status = :status::participation_status
            """);
    if (cursorRequestedAt != null) {
      sql.append(" AND (p.requested_at, p.id) > (:cursorRequestedAt, :cursorId)");
    }
    sql.append(" ORDER BY p.requested_at ASC, p.id ASC LIMIT :limit");

    var spec =
        jdbc.sql(sql.toString())
            .param("eventId", eventId)
            .param("status", status.label())
            .param("limit", limit);
    if (cursorRequestedAt != null) {
      spec = spec.param("cursorRequestedAt", ts(cursorRequestedAt)).param("cursorId", cursorId);
    }
    return spec.query(
            (ResultSet rs, int rowNum) ->
                new ParticipantRow(
                    rs.getObject("id", UUID.class),
                    rs.getObject("user_id", UUID.class),
                    rs.getString("alias"),
                    rs.getTimestamp("requested_at").toInstant()))
        .list();
  }

  public UUID insert(
      UUID eventId,
      UUID userId,
      ParticipationStatus status,
      Instant requestedAt,
      Instant resolvedAt,
      Instant now) {
    return jdbc.sql(
            """
            INSERT INTO participations (
                event_id, user_id, status, requested_at, resolved_at, version, created_at, updated_at
            ) VALUES (
                :eventId, :userId, :status::participation_status, :requestedAt, :resolvedAt, 0,
                :now, :now
            ) RETURNING id
            """)
        .param("eventId", eventId)
        .param("userId", userId)
        .param("status", status.label())
        .param("requestedAt", ts(requestedAt))
        .param("resolvedAt", resolvedAt == null ? null : ts(resolvedAt))
        .param("now", ts(now))
        .query(UUID.class)
        .single();
  }

  /** Re-opens a previously {@code rejected} row for a fresh join attempt. */
  public Optional<Participation> reopen(
      UUID id, ParticipationStatus status, Instant requestedAt, Instant resolvedAt, Instant now) {
    return jdbc.sql(
            """
            UPDATE participations
            SET status = :status::participation_status,
                requested_at = :requestedAt,
                resolved_at = :resolvedAt,
                abandoned_at = NULL,
                version = version + 1,
                updated_at = :now
            WHERE id = :id
            RETURNING id
            """)
        .param("id", id)
        .param("status", status.label())
        .param("requestedAt", ts(requestedAt))
        .param("resolvedAt", resolvedAt == null ? null : ts(resolvedAt))
        .param("now", ts(now))
        .query(UUID.class)
        .optional()
        .flatMap(this::findById);
  }

  /** Creator approves/rejects a pending request; optimistic on {@code version}. */
  public Optional<Participation> resolve(
      UUID id, ParticipationStatus status, Instant resolvedAt, long expectedVersion) {
    return jdbc.sql(
            """
            UPDATE participations
            SET status = :status::participation_status,
                resolved_at = :resolvedAt,
                version = version + 1,
                updated_at = :resolvedAt
            WHERE id = :id AND version = :expectedVersion AND status = 'pending'
            RETURNING id
            """)
        .param("id", id)
        .param("status", status.label())
        .param("resolvedAt", ts(resolvedAt))
        .param("expectedVersion", expectedVersion)
        .query(UUID.class)
        .optional()
        .flatMap(this::findById);
  }

  public void abandon(UUID id, Instant now) {
    jdbc.sql(
            """
            UPDATE participations
            SET status = 'abandoned', abandoned_at = :now, version = version + 1, updated_at = :now
            WHERE id = :id AND status = 'confirmed'
            """)
        .param("id", id)
        .param("now", ts(now))
        .update();
  }

  private Participation map(ResultSet rs, int rowNum) throws SQLException {
    return new Participation(
        rs.getObject("id", UUID.class),
        rs.getObject("event_id", UUID.class),
        rs.getObject("user_id", UUID.class),
        ParticipationStatus.fromDb(rs.getString("status")),
        rs.getTimestamp("requested_at").toInstant(),
        rs.getTimestamp("resolved_at") == null ? null : rs.getTimestamp("resolved_at").toInstant(),
        rs.getTimestamp("abandoned_at") == null
            ? null
            : rs.getTimestamp("abandoned_at").toInstant(),
        rs.getLong("version"),
        rs.getTimestamp("created_at").toInstant(),
        rs.getTimestamp("updated_at").toInstant());
  }

  private static OffsetDateTime ts(Instant instant) {
    return instant.atOffset(ZoneOffset.UTC);
  }

  public record ParticipantRow(
      UUID participationId, UUID userId, String alias, Instant requestedAt) {}
}
