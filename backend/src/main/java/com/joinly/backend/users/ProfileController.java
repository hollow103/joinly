package com.joinly.backend.users;

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

  public record UpsertProfileRequest(
      @NotBlank @Size(min = 3, max = 40) String alias,
      @Size(max = 2048) String photoUrl,
      @NotNull @AssertTrue(message = "must be confirmed") Boolean adultConfirmed,
      @NotBlank @Pattern(regexp = "[A-Za-z0-9._-]{1,32}") String termsVersion,
      @NotBlank @Pattern(regexp = "[A-Za-z0-9._-]{1,32}") String privacyVersion,
      @NotBlank @Pattern(regexp = "[A-Za-z0-9._-]{1,32}") String guidelinesVersion,
      @Valid ManualSearchAreaRequest manualSearchArea) {}

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
      String photoUrl,
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
          user.photoUrl(),
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
