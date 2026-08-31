package com.joinly.backend.participation;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class InvitationRepository {

  private static final String SELECT =
      """
      SELECT id, event_id, created_by, max_uses, used_count, expires_at, revoked_at,
             created_at, updated_at
      FROM invitations
      """;

  private final JdbcClient jdbc;

  public InvitationRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public UUID insert(
      UUID eventId,
      UUID createdBy,
      String codeHash,
      Integer maxUses,
      Instant expiresAt,
      Instant now) {
    return jdbc.sql(
            """
            INSERT INTO invitations (
                event_id, created_by, code_hash, max_uses, used_count, expires_at,
                created_at, updated_at
            ) VALUES (
                :eventId, :createdBy, :codeHash, :maxUses, 0, :expiresAt, :now, :now
            ) RETURNING id
            """)
        .param("eventId", eventId)
        .param("createdBy", createdBy)
        .param("codeHash", codeHash)
        .param("maxUses", maxUses)
        .param("expiresAt", expiresAt == null ? null : ts(expiresAt))
        .param("now", ts(now))
        .query(UUID.class)
        .single();
  }

  public Optional<Invitation> findByHash(String codeHash) {
    return jdbc.sql(SELECT + " WHERE code_hash = :codeHash")
        .param("codeHash", codeHash)
        .query(this::map)
        .optional();
  }

  public Optional<Invitation> findByEventAndId(UUID eventId, UUID invitationId) {
    return jdbc.sql(SELECT + " WHERE event_id = :eventId AND id = :invitationId")
        .param("eventId", eventId)
        .param("invitationId", invitationId)
        .query(this::map)
        .optional();
  }

  public void incrementUsedCount(UUID id, Instant now) {
    jdbc.sql("UPDATE invitations SET used_count = used_count + 1, updated_at = :now WHERE id = :id")
        .param("id", id)
        .param("now", ts(now))
        .update();
  }

  public boolean revoke(UUID eventId, UUID invitationId, Instant now) {
    return jdbc.sql(
                """
                UPDATE invitations SET revoked_at = :now, updated_at = :now
                WHERE event_id = :eventId AND id = :invitationId AND revoked_at IS NULL
                """)
            .param("eventId", eventId)
            .param("invitationId", invitationId)
            .param("now", ts(now))
            .update()
        > 0;
  }

  private Invitation map(ResultSet rs, int rowNum) throws SQLException {
    return new Invitation(
        rs.getObject("id", UUID.class),
        rs.getObject("event_id", UUID.class),
        rs.getObject("created_by", UUID.class),
        rs.getObject("max_uses", Integer.class),
        rs.getInt("used_count"),
        rs.getTimestamp("expires_at") == null ? null : rs.getTimestamp("expires_at").toInstant(),
        rs.getTimestamp("revoked_at") == null ? null : rs.getTimestamp("revoked_at").toInstant(),
        rs.getTimestamp("created_at").toInstant(),
        rs.getTimestamp("updated_at").toInstant());
  }

  private static OffsetDateTime ts(Instant instant) {
    return instant.atOffset(ZoneOffset.UTC);
  }
}
