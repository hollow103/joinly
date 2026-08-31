package com.joinly.backend.users;

import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class ProfileController {

  private final CurrentUserService currentUsers;
  private final ProfileService profiles;

  public ProfileController(CurrentUserService currentUsers, ProfileService profiles) {
    this.currentUsers = currentUsers;
    this.profiles = profiles;
  }

  @GetMapping
  ResponseEntity<ProfileResponse> get(@AuthenticationPrincipal Jwt jwt) {
    AppUser user = currentUsers.requireActive(jwt);
    return response(user);
  }

  @PutMapping
  ResponseEntity<ProfileResponse> put(
      @AuthenticationPrincipal Jwt jwt,
      @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch,
      @Valid @RequestBody UpsertProfileRequest request) {
    return response(profiles.upsert(jwt, request, ifMatch));
  }

  private ResponseEntity<ProfileResponse> response(AppUser user) {
    return ResponseEntity.ok()
        .eTag(profiles.etag(user))
        .body(ProfileResponse.from(user, profiles.agreementsAccepted(user)));
  }

  public static final class UpsertProfileRequest {

    @NotBlank
    @Size(min = 3, max = 40)
    private String alias;

    @NotNull
    @AssertTrue(message = "must be confirmed")
    private Boolean adultConfirmed;

    @NotBlank
    @Pattern(regexp = "[A-Za-z0-9._-]{1,32}")
    private String termsVersion;

    @NotBlank
    @Pattern(regexp = "[A-Za-z0-9._-]{1,32}")
    private String privacyVersion;

    @NotBlank
    @Pattern(regexp = "[A-Za-z0-9._-]{1,32}")
    private String guidelinesVersion;

    @Valid private ManualSearchAreaRequest manualSearchArea;
    private boolean manualSearchAreaProvided;

    public String alias() {
      return alias;
    }

    public String termsVersion() {
      return termsVersion;
    }

    public String privacyVersion() {
      return privacyVersion;
    }

    public String guidelinesVersion() {
      return guidelinesVersion;
    }

    public ManualSearchAreaRequest manualSearchArea() {
      return manualSearchArea;
    }

    public boolean hasManualSearchArea() {
      return manualSearchAreaProvided;
    }

    @JsonSetter("alias")
    public void setAlias(String alias) {
      this.alias = alias;
    }

    @JsonSetter("adultConfirmed")
    public void setAdultConfirmed(Boolean adultConfirmed) {
      this.adultConfirmed = adultConfirmed;
    }

    @JsonSetter("termsVersion")
    public void setTermsVersion(String termsVersion) {
      this.termsVersion = termsVersion;
    }

    @JsonSetter("privacyVersion")
    public void setPrivacyVersion(String privacyVersion) {
      this.privacyVersion = privacyVersion;
    }

    @JsonSetter("guidelinesVersion")
    public void setGuidelinesVersion(String guidelinesVersion) {
      this.guidelinesVersion = guidelinesVersion;
    }

    @JsonSetter("manualSearchArea")
    public void setManualSearchArea(ManualSearchAreaRequest manualSearchArea) {
      this.manualSearchArea = manualSearchArea;
      this.manualSearchAreaProvided = true;
    }
  }

  public record ManualSearchAreaRequest(
      @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
      @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
      @NotBlank @Size(max = 160) String label) {

    ManualSearchArea toDomain() {
      return new ManualSearchArea(longitude, latitude, label.trim());
    }
  }

  public record ProfileResponse(
      UUID id,
      String alias,
      String status,
      boolean emailVerified,
      boolean agreementsAccepted,
      String termsVersion,
      String privacyVersion,
      String guidelinesVersion,
      Instant termsAcceptedAt,
      Instant privacyAcceptedAt,
      Instant guidelinesAcceptedAt,
      ManualSearchArea manualSearchArea,
      String role,
      Instant createdAt,
      Instant updatedAt) {

    static ProfileResponse from(AppUser user, boolean agreementsAccepted) {
      return new ProfileResponse(
          user.id(),
          user.alias(),
          user.status(),
          user.emailVerified(),
          agreementsAccepted,
          user.termsVersion(),
          user.privacyVersion(),
          user.guidelinesVersion(),
          user.termsAcceptedAt(),
          user.privacyAcceptedAt(),
          user.guidelinesAcceptedAt(),
          user.manualSearchArea().longitude() == null ? null : user.manualSearchArea(),
          user.role(),
          user.createdAt(),
          user.updatedAt());
    }
  }
}
