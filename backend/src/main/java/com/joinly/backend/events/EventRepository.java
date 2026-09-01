package com.joinly.backend.events;

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
public class EventRepository {

  /**
   * Geography expression for the search origin, bound from {@code :originLon}/{@code :originLat}.
   */
  private static final String ORIGIN =
      "ST_SetSRID(ST_MakePoint(:originLon, :originLat), 4326)::geography";

  private static final String COLUMNS =
      """
      e.id, e.creator_id, u.alias AS creator_alias, e.title, e.description, e.notes,
      e.category::text AS category, e.starts_at, e.duration_minutes,
      ST_X(e.location::geometry) AS longitude, ST_Y(e.location::geometry) AS latitude,
      e.approximate_area, e.capacity, e.access_mode::text AS access_mode,
      e.status::text AS status, e.is_hidden, e.version,
      e.created_at, e.updated_at, e.cancelled_at
      """;

  private static final String FROM_JOIN = " FROM events e JOIN users u ON u.id = e.creator_id ";

  private final JdbcClient jdbc;

  public EventRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<Event> findById(UUID id) {
    return jdbc.sql("SELECT " + COLUMNS + FROM_JOIN + " WHERE e.id = :id AND u.status = 'active'")
        .param("id", id)
        .query(this::map)
        .optional();
  }

  /**
   * Loads the event and holds a row lock on it for the rest of the transaction, so concurrent joins
   * to the same event serialise their capacity checks (test B-07).
   */
  public Optional<Event> lockById(UUID id) {
    return jdbc.sql(
            "SELECT "
                + COLUMNS
                + FROM_JOIN
                + " WHERE e.id = :id AND u.status = 'active' FOR UPDATE OF e")
        .param("id", id)
        .query(this::map)
        .optional();
  }

  public int countActiveByCreator(UUID creatorId, Instant now) {
    return jdbc.sql(
            """
            SELECT count(*) FROM events
            WHERE creator_id = :creatorId AND status = 'published' AND starts_at > :now
            """)
        .param("creatorId", creatorId)
        .param("now", ts(now))
        .query(Integer.class)
        .single();
  }

  public Event insert(NewEvent data, Instant now) {
    UUID id =
        jdbc.sql(
                """
                INSERT INTO events (
                    creator_id, title, description, notes, category, starts_at, duration_minutes,
                    location, approximate_area, capacity, access_mode, status, version,
                    created_at, updated_at
                ) VALUES (
                    :creatorId, :title, :description, :notes, :category::event_category,
                    :startsAt, :durationMinutes,
                    ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                    :approximateArea, :capacity, :accessMode::event_access_mode, 'published', 0,
                    :now, :now
                ) RETURNING id
                """)
            .param("creatorId", data.creatorId())
            .param("title", data.title().trim())
            .param("description", data.description().trim())
            .param("notes", data.notes())
            .param("category", data.category().dbValue())
            .param("startsAt", ts(data.startsAt()))
            .param("durationMinutes", data.durationMinutes())
            .param("longitude", data.longitude())
            .param("latitude", data.latitude())
            .param("approximateArea", data.approximateArea())
            .param("capacity", data.capacity())
            .param("accessMode", data.accessMode().dbValue())
            .param("now", ts(now))
            .query(UUID.class)
            .single();
    return findById(id).orElseThrow();
  }

  public Optional<Event> update(EventState state, long expectedVersion, Instant now) {
    return jdbc.sql(
            """
            UPDATE events
            SET title = :title,
                description = :description,
                notes = :notes,
                category = :category::event_category,
                starts_at = :startsAt,
                duration_minutes = :durationMinutes,
                location = ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                approximate_area = :approximateArea,
                capacity = :capacity,
                access_mode = :accessMode::event_access_mode,
                version = version + 1,
                updated_at = :now
            WHERE id = :id AND version = :expectedVersion AND status = 'published'
            RETURNING id
            """)
        .param("id", state.id())
        .param("title", state.title().trim())
        .param("description", state.description().trim())
        .param("notes", state.notes())
        .param("category", state.category().dbValue())
        .param("startsAt", ts(state.startsAt()))
        .param("durationMinutes", state.durationMinutes())
        .param("longitude", state.longitude())
        .param("latitude", state.latitude())
        .param("approximateArea", state.approximateArea())
        .param("capacity", state.capacity())
        .param("accessMode", state.accessMode().dbValue())
        .param("expectedVersion", expectedVersion)
        .param("now", ts(now))
        .query(UUID.class)
        .optional()
        .flatMap(this::findById);
  }

  public boolean cancel(UUID id, long expectedVersion, Instant now) {
    return jdbc.sql(
                """
            UPDATE events
            SET status = 'cancelled', cancelled_at = :now, version = version + 1, updated_at = :now
            WHERE id = :id AND version = :expectedVersion AND status = 'published'
            """)
            .param("id", id)
            .param("expectedVersion", expectedVersion)
            .param("now", ts(now))
            .update()
        > 0;
  }

  private static final String CONFIRMED_COUNT_SUBQUERY =
      "(SELECT count(*) FROM participations p WHERE p.event_id = e.id AND p.status = 'confirmed')";

  /**
   * Discovery query: published, not hidden, non-private, future events within {@code radiusMeters}
   * that are not full and not blocked either way against {@code viewerId}, ordered by (distance,
   * startsAt, id) so the keyset cursor is stable. {@code limit} should already be the page size
   * plus one, to detect whether a further page exists.
   *
   * <p>Reads {@code participations} and {@code blocks} by subquery so the full-event and block
   * filters can run in SQL and respect {@code LIMIT}; it never writes to those tables.
   */
  public List<EventWithDistance> search(
      UUID viewerId,
      double originLon,
      double originLat,
      int radiusMeters,
      List<String> dbCategories,
      KeysetCursor cursor,
      int limit,
      Instant now) {
    StringBuilder sql =
        new StringBuilder("SELECT ")
            .append(COLUMNS)
            .append(", ST_Distance(e.location, ")
            .append(ORIGIN)
            .append(") AS distance_meters, ")
            .append(CONFIRMED_COUNT_SUBQUERY)
            .append(" AS confirmed_count")
            .append(FROM_JOIN)
            .append(" WHERE e.status = 'published' AND e.is_hidden = false AND u.status = 'active'")
            .append(" AND e.access_mode <> 'private_invitation' AND e.starts_at > :now")
            .append(" AND ST_DWithin(e.location, ")
            .append(ORIGIN)
            .append(", :radiusMeters)")
            .append(" AND (e.capacity IS NULL OR ")
            .append(CONFIRMED_COUNT_SUBQUERY)
            .append(" < e.capacity)")
            .append(
                " AND NOT EXISTS (SELECT 1 FROM blocks b WHERE"
                    + " (b.blocker_id = :viewerId AND b.blocked_id = e.creator_id)"
                    + " OR (b.blocker_id = e.creator_id AND b.blocked_id = :viewerId))");
    if (!dbCategories.isEmpty()) {
      sql.append(" AND e.category::text IN (:categories)");
    }
    if (cursor != null) {
      sql.append(" AND (ST_Distance(e.location, ")
          .append(ORIGIN)
          .append("), e.starts_at, e.id) > (:curDistance, :curStartsAt, :curId)");
    }
    sql.append(" ORDER BY distance_meters ASC, e.starts_at ASC, e.id ASC LIMIT :limit");

    var spec =
        jdbc.sql(sql.toString())
            .param("viewerId", viewerId)
            .param("originLon", originLon)
            .param("originLat", originLat)
            .param("radiusMeters", radiusMeters)
            .param("now", ts(now))
            .param("limit", limit);
    if (!dbCategories.isEmpty()) {
      spec = spec.param("categories", dbCategories);
    }
    if (cursor != null) {
      spec =
          spec.param("curDistance", Double.parseDouble(cursor.sortKey()))
              .param("curStartsAt", ts(cursor.timestamp()))
              .param("curId", cursor.id());
    }
    return spec.query(
            (ResultSet rs, int rowNum) ->
                new EventWithDistance(
                    map(rs, rowNum), rs.getDouble("distance_meters"), rs.getInt("confirmed_count")))
        .list();
  }

  /** Own events, newest start first, ordered by (startsAt, id) for a stable keyset cursor. */
  public List<Event> findByCreator(
      UUID creatorId, String dbStatus, KeysetCursor cursor, int limit) {
    StringBuilder sql =
        new StringBuilder("SELECT ")
            .append(COLUMNS)
            .append(FROM_JOIN)
            .append(" WHERE e.creator_id = :creatorId");
    if (dbStatus != null) {
      sql.append(" AND e.status::text = :status");
    }
    if (cursor != null) {
      sql.append(" AND (e.starts_at, e.id) < (:curStartsAt, :curId)");
    }
    sql.append(" ORDER BY e.starts_at DESC, e.id DESC LIMIT :limit");

    var spec = jdbc.sql(sql.toString()).param("creatorId", creatorId).param("limit", limit);
    if (dbStatus != null) {
      spec = spec.param("status", dbStatus);
    }
    if (cursor != null) {
      spec = spec.param("curStartsAt", ts(cursor.timestamp())).param("curId", cursor.id());
    }
    return spec.query(this::map).list();
  }

  private Event map(ResultSet rs, int rowNum) throws SQLException {
    return new Event(
        rs.getObject("id", UUID.class),
        rs.getObject("creator_id", UUID.class),
        rs.getString("creator_alias"),
        rs.getString("title"),
        rs.getString("description"),
        rs.getString("notes"),
        EventCategory.fromDb(rs.getString("category")),
        rs.getTimestamp("starts_at").toInstant(),
        rs.getInt("duration_minutes"),
        rs.getDouble("longitude"),
        rs.getDouble("latitude"),
        rs.getString("approximate_area"),
        rs.getObject("capacity", Integer.class),
        AccessMode.fromDb(rs.getString("access_mode")),
        rs.getString("status"),
        rs.getBoolean("is_hidden"),
        rs.getLong("version"),
        rs.getTimestamp("created_at").toInstant(),
        rs.getTimestamp("updated_at").toInstant(),
        rs.getTimestamp("cancelled_at") == null
            ? null
            : rs.getTimestamp("cancelled_at").toInstant());
  }

  private static OffsetDateTime ts(Instant instant) {
    return instant.atOffset(ZoneOffset.UTC);
  }

  public record NewEvent(
      UUID creatorId,
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
      AccessMode accessMode) {}

  public record EventState(
      UUID id,
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
      AccessMode accessMode) {}

  public record EventWithDistance(Event event, double distanceMeters, int confirmedCount) {}
}
