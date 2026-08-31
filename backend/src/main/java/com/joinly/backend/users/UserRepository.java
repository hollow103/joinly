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
            SELECT id, auth_subject, alias, photo_url, status::text, email_verified,
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
                            auth_subject, alias, alias_normalized, photo_url, email_verified,
                            adult_confirmed_at, terms_version, privacy_version, guidelines_version,
                            terms_accepted_at, privacy_accepted_at, guidelines_accepted_at,
                            preferred_search_point, preferred_search_label, created_at, updated_at
                        ) VALUES (
                            :authSubject, :alias, lower(trim(:alias)), :photoUrl, :emailVerified,
                            :now, :termsVersion, :privacyVersion, :guidelinesVersion,
                            :now, :now, :now,
                            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                            :label, :now, :now
                        ) RETURNING id
                        """)
            .param("authSubject", profile.authSubject())
            .param("alias", profile.alias().trim())
            .param("photoUrl", profile.photoUrl())
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
                        photo_url = :photoUrl,
                        email_verified = :emailVerified,
                        preferred_search_point = ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                        preferred_search_label = :label,
                        version = version + 1,
                        updated_at = :now
                    WHERE auth_subject = :authSubject AND version = :expectedVersion AND status = 'active'
                    RETURNING id
                    """)
        .param("authSubject", profile.authSubject())
        .param("alias", profile.alias().trim())
        .param("photoUrl", profile.photoUrl())
        .param("emailVerified", profile.emailVerified())
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
        resultSet.getString("photo_url"),
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
      String photoUrl,
      boolean emailVerified,
      String termsVersion,
      String privacyVersion,
      String guidelinesVersion,
      ManualSearchArea manualSearchArea) {}
}
