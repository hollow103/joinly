package com.joinly.backend.users;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

  private static final String SELECT =
      """
            SELECT id, auth_subject, alias, status::text, email_verified,
                   terms_version, privacy_version, guidelines_version, terms_accepted_at,
                   privacy_accepted_at, guidelines_accepted_at,
                   ST_X(preferred_search_point::geometry) AS preferred_longitude,
                   ST_Y(preferred_search_point::geometry) AS preferred_latitude,
                   preferred_search_label, role::text, version, created_at, updated_at
            FROM users
            """;

  private final JdbcClient jdbc;

  public UserRepository(JdbcClient jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<AppUser> findByAuthSubject(UUID authSubject) {
    return jdbc.sql(SELECT + " WHERE auth_subject = :authSubject")
        .param("authSubject", authSubject)
        .query(this::map)
        .optional();
  }

  public AppUser create(ProfileData profile, Instant now) {
    UUID id =
        jdbc.sql(
                """
                        INSERT INTO users (
                            auth_subject, alias, alias_normalized, email_verified,
                            adult_confirmed_at, terms_version, privacy_version, guidelines_version,
                            terms_accepted_at, privacy_accepted_at, guidelines_accepted_at,
                            preferred_search_point, preferred_search_label, created_at, updated_at
                        ) VALUES (
                            :authSubject, :alias, lower(trim(:alias)), :emailVerified,
                            :now, :termsVersion, :privacyVersion, :guidelinesVersion,
                            :now, :now, :now,
                            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                            :label, :now, :now
                        ) RETURNING id
                        """)
            .param("authSubject", profile.authSubject())
            .param("alias", profile.alias().trim())
            .param("emailVerified", profile.emailVerified())
            .param("termsVersion", profile.termsVersion())
            .param("privacyVersion", profile.privacyVersion())
            .param("guidelinesVersion", profile.guidelinesVersion())
            .param("longitude", profile.manualSearchArea().longitude())
            .param("latitude", profile.manualSearchArea().latitude())
            .param("label", profile.manualSearchArea().label())
            .param("now", now.atOffset(ZoneOffset.UTC))
            .query(UUID.class)
            .single();
    return findById(id).orElseThrow();
  }

  public Optional<AppUser> update(ProfileData profile, long expectedVersion, Instant now) {
    return jdbc.sql(
            """
                    UPDATE users
                    SET alias = :alias,
                        alias_normalized = lower(trim(:alias)),
                        email_verified = :emailVerified,
                        terms_version = :termsVersion,
                        privacy_version = :privacyVersion,
                        guidelines_version = :guidelinesVersion,
                        terms_accepted_at = CASE WHEN terms_version IS DISTINCT FROM :termsVersion THEN :now ELSE terms_accepted_at END,
                        privacy_accepted_at = CASE WHEN privacy_version IS DISTINCT FROM :privacyVersion THEN :now ELSE privacy_accepted_at END,
                        guidelines_accepted_at = CASE WHEN guidelines_version IS DISTINCT FROM :guidelinesVersion THEN :now ELSE guidelines_accepted_at END,
                        preferred_search_point = ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                        preferred_search_label = :label,
                        version = version + 1,
                        updated_at = :now
                    WHERE auth_subject = :authSubject AND version = :expectedVersion AND status = 'active'
                    RETURNING id
                    """)
        .param("authSubject", profile.authSubject())
        .param("alias", profile.alias().trim())
        .param("emailVerified", profile.emailVerified())
        .param("termsVersion", profile.termsVersion())
        .param("privacyVersion", profile.privacyVersion())
        .param("guidelinesVersion", profile.guidelinesVersion())
        .param("longitude", profile.manualSearchArea().longitude())
        .param("latitude", profile.manualSearchArea().latitude())
        .param("label", profile.manualSearchArea().label())
        .param("now", now.atOffset(ZoneOffset.UTC))
        .param("expectedVersion", expectedVersion)
        .query(UUID.class)
        .optional()
        .flatMap(this::findById);
  }

  public void synchronizeEmailVerified(UUID id, boolean emailVerified, Instant now) {
    jdbc.sql(
            """
                    UPDATE users
                    SET email_verified = :emailVerified, version = version + 1, updated_at = :now
                    WHERE id = :id AND email_verified IS DISTINCT FROM :emailVerified
                    """)
        .param("id", id)
        .param("emailVerified", emailVerified)
        .param("now", now.atOffset(ZoneOffset.UTC))
        .update();
  }

  public boolean requestDeletion(UUID authSubject, Instant now) {
    return jdbc.sql(
                """
                UPDATE users
                SET status = 'deletion_requested', deletion_requested_at = :now,
                    version = version + 1, updated_at = :now
                WHERE auth_subject = :authSubject AND status = 'active'
                """)
            .param("authSubject", authSubject)
            .param("now", now.atOffset(ZoneOffset.UTC))
            .update()
        == 1;
  }

  public int anonymizeDeletionRequestsBefore(Instant cutoff, Instant now) {
    return jdbc.sql(
            """
            WITH affected AS (
                UPDATE users
                SET auth_subject = gen_random_uuid(),
                    alias = 'Deleted user',
                    alias_normalized = 'deleted-' || replace(id::text, '-', ''),
                    email_verified = false,
                    preferred_search_point = NULL,
                    preferred_search_label = NULL,
                    role = 'user',
                    version = version + 1,
                    updated_at = :now
                WHERE status = 'deletion_requested' AND deletion_requested_at <= :cutoff
                RETURNING id
            ), hidden_events AS (
                UPDATE events SET is_hidden = true, status = 'closed', version = version + 1, updated_at = :now
                WHERE creator_id IN (SELECT id FROM affected)
                  AND status = 'published' AND starts_at > :now
            ), removed_devices AS (
                DELETE FROM push_devices WHERE user_id IN (SELECT id FROM affected)
            )
            INSERT INTO account_audit (actor_id, subject_id, action, note, created_at)
            SELECT NULL, id, 'account_anonymized', 'Retention period elapsed', :now FROM affected
            """)
        .param("cutoff", cutoff.atOffset(ZoneOffset.UTC))
        .param("now", now.atOffset(ZoneOffset.UTC))
        .update();
  }

  private Optional<AppUser> findById(UUID id) {
    return jdbc.sql(SELECT + " WHERE id = :id").param("id", id).query(this::map).optional();
  }

  private AppUser map(ResultSet resultSet, int rowNum) throws SQLException {
    Double longitude = resultSet.getObject("preferred_longitude", Double.class);
    Double latitude = resultSet.getObject("preferred_latitude", Double.class);
    ManualSearchArea manualSearchArea =
        longitude == null
            ? new ManualSearchArea(null, null, null)
            : new ManualSearchArea(
                longitude, latitude, resultSet.getString("preferred_search_label"));
    return new AppUser(
        resultSet.getObject("id", UUID.class),
        resultSet.getObject("auth_subject", UUID.class),
        resultSet.getString("alias"),
        resultSet.getString("status"),
        resultSet.getBoolean("email_verified"),
        resultSet.getString("terms_version"),
        resultSet.getString("privacy_version"),
        resultSet.getString("guidelines_version"),
        resultSet.getTimestamp("terms_accepted_at").toInstant(),
        resultSet.getTimestamp("privacy_accepted_at").toInstant(),
        resultSet.getTimestamp("guidelines_accepted_at").toInstant(),
        manualSearchArea,
        resultSet.getString("role"),
        resultSet.getLong("version"),
        resultSet.getTimestamp("created_at").toInstant(),
        resultSet.getTimestamp("updated_at").toInstant());
  }

  public record ProfileData(
      UUID authSubject,
      String alias,
      boolean emailVerified,
      String termsVersion,
      String privacyVersion,
      String guidelinesVersion,
      ManualSearchArea manualSearchArea) {}
}
