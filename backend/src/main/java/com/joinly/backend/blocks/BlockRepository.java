package com.joinly.backend.blocks;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class BlockRepository {

  private final JdbcClient jdbc;

  public BlockRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  /**
   * Idempotent insert. Returns {@code false} when the row already existed. Throws {@link
   * DataIntegrityViolationException} when {@code blockedId} is not a known user (FK violation),
   * which the service maps to {@code 404}.
   */
  public boolean insertIfAbsent(UUID blockerId, UUID blockedId, Instant now) {
    return jdbc.sql(
                """
                INSERT INTO blocks (blocker_id, blocked_id, created_at)
                VALUES (:blockerId, :blockedId, :now)
                ON CONFLICT (blocker_id, blocked_id) DO NOTHING
                """)
            .param("blockerId", blockerId)
            .param("blockedId", blockedId)
            .param("now", ts(now))
            .update()
        > 0;
  }

  public boolean delete(UUID blockerId, UUID blockedId) {
    return jdbc.sql("DELETE FROM blocks WHERE blocker_id = :blockerId AND blocked_id = :blockedId")
            .param("blockerId", blockerId)
            .param("blockedId", blockedId)
            .update()
        > 0;
  }

  public boolean existsBetween(UUID a, UUID b) {
    return Boolean.TRUE.equals(
        jdbc.sql(
                """
                SELECT EXISTS (
                    SELECT 1 FROM blocks
                    WHERE (blocker_id = :a AND blocked_id = :b)
                       OR (blocker_id = :b AND blocked_id = :a)
                )
                """)
            .param("a", a)
            .param("b", b)
            .query(Boolean.class)
            .single());
  }

  /**
   * Blocks created by {@code blockerId}, newest first, keyset paginated by {@code (created_at,
   * id)}.
   */
  public List<BlockRow> findByBlocker(
      UUID blockerId, Instant cursorCreatedAt, UUID cursorId, int limit) {
    StringBuilder sql =
        new StringBuilder(
            """
            SELECT b.id, b.blocked_id, u.alias AS blocked_alias, b.created_at
            FROM blocks b JOIN users u ON u.id = b.blocked_id
            WHERE b.blocker_id = :blockerId
            """);
    if (cursorCreatedAt != null) {
      sql.append(" AND (b.created_at, b.id) < (:cursorCreatedAt, :cursorId)");
    }
    sql.append(" ORDER BY b.created_at DESC, b.id DESC LIMIT :limit");

    var spec = jdbc.sql(sql.toString()).param("blockerId", blockerId).param("limit", limit);
    if (cursorCreatedAt != null) {
      spec = spec.param("cursorCreatedAt", ts(cursorCreatedAt)).param("cursorId", cursorId);
    }
    return spec.query(BlockRepository::map).list();
  }

  private static BlockRow map(ResultSet rs, int rowNum) throws SQLException {
    return new BlockRow(
        rs.getObject("id", UUID.class),
        rs.getObject("blocked_id", UUID.class),
        rs.getString("blocked_alias"),
        rs.getTimestamp("created_at").toInstant());
  }

  public record BlockRow(UUID id, UUID blockedId, String blockedAlias, Instant createdAt) {}

  private static OffsetDateTime ts(Instant instant) {
    return instant.atOffset(ZoneOffset.UTC);
  }
}
