package com.joinly.backend.users;

import com.joinly.backend.authentication.JwtClaims;
import com.joinly.backend.authentication.SupabaseAuthClient;
import com.joinly.backend.shared.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

  private final UserRepository users;
  private final JwtClaims claims;
  private final SupabaseAuthClient supabaseAuth;
  private final Clock clock;
  private final AgreementPolicy agreements;

  public ProfileService(
      UserRepository users,
      JwtClaims claims,
      SupabaseAuthClient supabaseAuth,
      Clock clock,
      AgreementPolicy agreements) {
    this.users = users;
    this.claims = claims;
    this.supabaseAuth = supabaseAuth;
    this.clock = clock;
    this.agreements = agreements;
  }

  public AppUser upsert(Jwt jwt, ProfileController.UpsertProfileRequest request, String ifMatch) {
    UUID subject = claims.subject(jwt);
    Instant now = Instant.now(clock);
    AppUser existing = users.findByAuthSubject(subject).orElse(null);
    requireCurrentAgreementVersions(request);
    if (existing != null && !"active".equals(existing.status())) {
      throw new BusinessException(
          HttpStatus.FORBIDDEN, "account_suspended", "The account cannot use product operations.");
    }
    ManualSearchArea manualSearchArea =
        !request.hasManualSearchArea()
            ? existing == null
                ? new ManualSearchArea(null, null, null)
                : existing.manualSearchArea()
            : request.manualSearchArea() == null
                ? new ManualSearchArea(null, null, null)
                : request.manualSearchArea().toDomain();
    UserRepository.ProfileData profile =
        new UserRepository.ProfileData(
            subject,
            request.alias(),
            supabaseAuth.emailVerified(jwt.getTokenValue()),
            request.termsVersion(),
            request.privacyVersion(),
            request.guidelinesVersion(),
            manualSearchArea);
    if (existing == null) {
      return users.create(profile, now);
    }
    if (ifMatch == null || ifMatch.isBlank()) {
      throw new BusinessException(
          HttpStatus.PRECONDITION_REQUIRED,
          "if_match_required",
          "If-Match is required when updating an existing profile.");
    }
    if (!etag(existing).equals(ifMatch)) {
      throw new BusinessException(
          HttpStatus.PRECONDITION_FAILED,
          "concurrent_update",
          "The profile has changed since it was retrieved.");
    }
    return users
        .update(profile, existing.version(), now)
        .orElseThrow(
            () ->
                new BusinessException(
                    HttpStatus.PRECONDITION_FAILED,
                    "concurrent_update",
                    "The profile has changed since it was retrieved."));
  }

  public boolean agreementsAccepted(AppUser user) {
    return agreements.accepted(user);
  }

  @Transactional
  public void requestDeletion(Jwt jwt) {
    UUID subject = claims.subject(jwt);
    AppUser existing =
        users
            .findByAuthSubject(subject)
            .orElseThrow(
                () ->
                    new BusinessException(
                        HttpStatus.FORBIDDEN,
                        "profile_required",
                        "Create the internal profile before using Joinly."));
    if ("deletion_requested".equals(existing.status())) {
      return;
    }
    if (!"active".equals(existing.status())) {
      throw new BusinessException(
          HttpStatus.FORBIDDEN, "account_suspended", "The account cannot use product operations.");
    }
    users.requestDeletion(subject, Instant.now(clock));
  }

  public String etag(AppUser user) {
    return "\"profile-" + user.version() + "\"";
  }

  private void requireCurrentAgreementVersions(ProfileController.UpsertProfileRequest request) {
    if (!agreements.matches(
        request.termsVersion(), request.privacyVersion(), request.guidelinesVersion())) {
      throw new BusinessException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "agreement_version_invalid",
          "All current agreement versions must be accepted.");
    }
  }
}
