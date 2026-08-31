package com.joinly.backend.participation;

import com.joinly.backend.shared.PublicProfile;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/events/{eventId}")
public class ParticipationController {

  private final ParticipationService participations;
  private final InvitationService invitations;

  public ParticipationController(
      ParticipationService participations, InvitationService invitations) {
    this.participations = participations;
    this.invitations = invitations;
  }

  @PostMapping("/participations")
  ResponseEntity<ParticipationResponse> join(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID eventId,
      @RequestHeader(name = "Idempotency-Key") String idempotencyKey,
      @RequestBody(required = false) JoinRequest request) {
    String code = request == null ? null : request.normalizedCode();
    Participation participation = participations.join(jwt, eventId, code, idempotencyKey);
    return ResponseEntity.status(HttpStatus.CREATED)
        .eTag(participations.etag(participation))
        .body(ParticipationResponse.of(participation));
  }

  @DeleteMapping("/participation")
  ResponseEntity<Void> abandon(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID eventId) {
    participations.abandon(jwt, eventId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/participations")
  ResponseEntity<ParticipantPageResponse> list(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID eventId,
      @RequestParam(name = "status", defaultValue = "confirmed") String status,
      @RequestParam(name = "cursor", required = false) String cursor,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {
    ParticipationService.ParticipantListPage page =
        participations.listForCreator(jwt, eventId, status, cursor, limit);
    List<ParticipantResponse> items =
        page.items().stream()
            .map(
                item ->
                    new ParticipantResponse(
                        item.participationId(), item.user(), item.status(), item.requestedAt()))
            .toList();
    return ResponseEntity.ok(new ParticipantPageResponse(items, new PageInfo(page.nextCursor())));
  }

  @PatchMapping("/participations/{participationId}")
  ResponseEntity<ParticipationResponse> resolve(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID eventId,
      @PathVariable UUID participationId,
      @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch,
      @RequestBody ResolveRequest request) {
    Participation participation =
        participations.resolve(jwt, eventId, participationId, request.status(), ifMatch);
    return ResponseEntity.ok()
        .eTag(participations.etag(participation))
        .body(ParticipationResponse.of(participation));
  }

  @PostMapping("/invitations")
  ResponseEntity<InvitationResponse> createInvitation(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID eventId,
      @RequestBody(required = false) CreateInvitationRequest request) {
    Instant expiresAt = request == null ? null : request.expiresAt();
    Integer maxUses = request == null ? null : request.maxUses();
    InvitationService.CreatedInvitation created =
        invitations.create(jwt, eventId, expiresAt, maxUses);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            new InvitationResponse(
                created.id(), created.code(), created.expiresAt(), created.maxUses()));
  }

  @DeleteMapping("/invitations/{invitationId}")
  ResponseEntity<Void> revokeInvitation(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID eventId,
      @PathVariable UUID invitationId) {
    invitations.revoke(jwt, eventId, invitationId);
    return ResponseEntity.noContent().build();
  }

  public record JoinRequest(@Size(min = 1, max = 128) String invitationCode) {
    String normalizedCode() {
      return invitationCode == null || invitationCode.isBlank() ? null : invitationCode.trim();
    }
  }

  public record ResolveRequest(@NotBlank @Pattern(regexp = "confirmed|rejected") String status) {}

  public record CreateInvitationRequest(Instant expiresAt, @Min(1) Integer maxUses) {}

  public record ParticipationResponse(
      UUID id, UUID eventId, String status, Instant requestedAt, Instant resolvedAt) {

    static ParticipationResponse of(Participation participation) {
      return new ParticipationResponse(
          participation.id(),
          participation.eventId(),
          participation.status().label(),
          participation.requestedAt(),
          participation.resolvedAt());
    }
  }

  public record InvitationResponse(UUID id, String code, Instant expiresAt, Integer maxUses) {}

  public record ParticipantResponse(
      UUID participationId, PublicProfile user, String status, Instant requestedAt) {}

  public record PageInfo(String nextCursor) {}

  public record ParticipantPageResponse(List<ParticipantResponse> items, PageInfo page) {}
}
