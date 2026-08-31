package com.joinly.backend.users;

import com.joinly.backend.authentication.JwtClaims;
import com.joinly.backend.authentication.SupabaseAuthClient;
import com.joinly.backend.shared.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {

  private final UserRepository users;
  private final JwtClaims claims;
  private final SupabaseAuthClient supabaseAuth;
  private final Clock clock;
  private final AgreementVersions agreementVersions;

  public ProfileService(
      UserRepository users,
      JwtClaims claims,
      SupabaseAuthClient supabaseAuth,
      Clock clock,
      @Value("${joinly.agreements.terms-version}") String termsVersion,
      @Value("${joinly.agreements.privacy-version}") String privacyVersion,
      @Value("${joinly.agreements.guidelines-version}") String guidelinesVersion) {
    this.users = users;
    this.claims = claims;
    this.supabaseAuth = supabaseAuth;
    this.clock = clock;
    this.agreementVersions = new AgreementVersions(termsVersion, privacyVersion, guidelinesVersion);
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
        request.manualSearchArea() == null
            ? existing == null
                ? new ManualSearchArea(null, null, null)
                : existing.manualSearchArea()
            : request.manualSearchArea().toDomain();
    UserRepository.ProfileData profile =
        new UserRepository.ProfileData(
            subject,
            request.alias(),
            request.photoUrl(),
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
    return agreementVersions.termsVersion().equals(user.termsVersion())
        && agreementVersions.privacyVersion().equals(user.privacyVersion())
        && agreementVersions.guidelinesVersion().equals(user.guidelinesVersion());
  }

  public String etag(AppUser user) {
    return "\"profile-" + user.version() + "\"";
  }

  private void requireCurrentAgreementVersions(ProfileController.UpsertProfileRequest request) {
    if (!agreementVersions.termsVersion().equals(request.termsVersion())
        || !agreementVersions.privacyVersion().equals(request.privacyVersion())
        || !agreementVersions.guidelinesVersion().equals(request.guidelinesVersion())) {
      throw new BusinessException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "agreement_version_invalid",
          "All current agreement versions must be accepted.");
    }
  }

  private record AgreementVersions(
      String termsVersion, String privacyVersion, String guidelinesVersion) {}
}
