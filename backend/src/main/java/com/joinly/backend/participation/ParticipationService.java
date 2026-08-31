package com.joinly.backend.participation;

import com.joinly.backend.blocks.BlockService;
import com.joinly.backend.events.AccessMode;
import com.joinly.backend.events.Event;
import com.joinly.backend.events.EventService;
import com.joinly.backend.shared.BusinessException;
import com.joinly.backend.shared.KeysetCursor;
import com.joinly.backend.shared.PublicProfile;
import com.joinly.backend.users.AppUser;
import com.joinly.backend.users.CurrentUserService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use-case rules and transaction boundaries for participations. Every capacity-sensitive path locks
 * the event row ({@link EventService#lockForParticipation}) before counting confirmed rows, so
 * concurrent joins to the last place serialise (test B-07).
 */
@Service
public class ParticipationService {

  private final ParticipationRepository participations;
  private final InvitationRepository invitations;
  private final InvitationCodes invitationCodes;
  private final IdempotencyService idempotency;
  private final EventService events;
  private final CurrentUserService currentUsers;
  private final BlockService blocks;
  private final Clock clock;

  public ParticipationService(
      ParticipationRepository participations,
      InvitationRepository invitations,
      InvitationCodes invitationCodes,
      IdempotencyService idempotency,
      EventService events,
      CurrentUserService currentUsers,
      BlockService blocks,
      Clock clock) {
    this.participations = participations;
    this.invitations = invitations;
    this.invitationCodes = invitationCodes;
    this.idempotency = idempotency;
    this.events = events;
    this.currentUsers = currentUsers;
    this.blocks = blocks;
    this.clock = clock;
  }

  @Transactional
  public Participation join(Jwt jwt, UUID eventId, String invitationCode, String idempotencyKey) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw new BusinessException(
          HttpStatus.BAD_REQUEST, "validation_error", "Idempotency-Key is required.");
    }
    AppUser user = currentUsers.requireEligibleForEvents(jwt);
    Instant now = Instant.now(clock);
    String requestHash = idempotency.requestHash(eventId, invitationCode);
    Optional<UUID> replayed = idempotency.replay(user.id(), idempotencyKey, requestHash, now);
    if (replayed.isPresent()) {
      return participations.findById(replayed.get()).orElseThrow();
    }

    Event event = events.lockForParticipation(eventId);
    if (blocks.blocked(user.id(), event.creatorId())) {
      throw notFound();
    }
    if (event.creatorId().equals(user.id())) {
      throw conflict("cannot_join_own_event", "The creator cannot join their own event.");
    }
    if (event.hidden()
        || (event.accessMode() == AccessMode.PRIVATE_INVITATION && invitationCode == null)) {
      throw notFound();
    }
    if (!event.isPublished()) {
      throw conflict("event_not_joinable", "The event is not open for participation.");
    }
    if (!event.startsInTheFuture(now)) {
      throw conflict("event_not_joinable", "The event has already started.");
    }

    Participation existing = participations.findByEventAndUser(eventId, user.id()).orElse(null);
    if (existing != null && existing.status() != ParticipationStatus.REJECTED) {
      throw conflict("participation_exists", "You already have a participation for this event.");
    }

    Invitation invitation = null;
    if (event.accessMode() == AccessMode.PRIVATE_INVITATION) {
      invitation =
          invitations
              .findByHash(invitationCodes.hash(invitationCode))
              .filter(i -> i.eventId().equals(eventId) && i.usable(now))
              .orElseThrow(
                  () -> conflict("invitation_invalid", "The invitation code is not valid."));
    }

    if (event.capacity() != null && participations.countConfirmed(eventId) >= event.capacity()) {
      throw conflict("event_full", "No places are available for this event.");
    }

    ParticipationStatus status =
        event.accessMode() == AccessMode.APPROVAL
            ? ParticipationStatus.PENDING
            : ParticipationStatus.CONFIRMED;
    Instant resolvedAt = status == ParticipationStatus.CONFIRMED ? now : null;

    Participation saved;
    if (existing == null) {
      UUID id = participations.insert(eventId, user.id(), status, now, resolvedAt, now);
      saved = participations.findById(id).orElseThrow();
    } else {
      saved = participations.reopen(existing.id(), status, now, resolvedAt, now).orElseThrow();
    }

    if (invitation != null) {
      invitations.incrementUsedCount(invitation.id(), now);
    }
    idempotency.record(user.id(), idempotencyKey, requestHash, saved.id(), now);
    // Phase 4: record a notification for the creator when status == PENDING.
    return saved;
  }

  @Transactional
  public void abandon(Jwt jwt, UUID eventId) {
    AppUser user = currentUsers.requireActive(jwt);
    Instant now = Instant.now(clock);
    Participation p =
        participations.findByEventAndUser(eventId, user.id()).orElseThrow(this::notFound);
    if (p.status() == ParticipationStatus.ABANDONED) {
      return; // idempotent
    }
    if (p.status() != ParticipationStatus.CONFIRMED) {
      throw conflict(
          "participation_not_confirmed", "Only a confirmed participation can be abandoned.");
    }
    Event event = events.lockForParticipation(eventId);
    if (!event.startsInTheFuture(now)) {
      throw conflict("event_started", "The event has already started.");
    }
    participations.abandon(p.id(), now);
  }

  @Transactional
  public Participation resolve(
      Jwt jwt, UUID eventId, UUID participationId, String targetStatus, String ifMatch) {
    AppUser user = currentUsers.requireActive(jwt);
    Instant now = Instant.now(clock);
    Event event = events.lockForParticipation(eventId);
    if (!event.creatorId().equals(user.id())) {
      throw notFound();
    }
    if (event.accessMode() != AccessMode.APPROVAL) {
      throw conflict("event_not_approval", "This event does not use request approval.");
    }
    Participation p =
        participations
            .findById(participationId)
            .filter(x -> x.eventId().equals(eventId))
            .orElseThrow(this::notFound);
    if (p.status() != ParticipationStatus.PENDING) {
      throw conflict("participation_not_pending", "The request is not pending.");
    }
    requireIfMatch(p, ifMatch);
    ParticipationStatus target =
        "confirmed".equals(targetStatus)
            ? ParticipationStatus.CONFIRMED
            : ParticipationStatus.REJECTED;
    if (target == ParticipationStatus.CONFIRMED
        && event.capacity() != null
        && participations.countConfirmed(eventId) >= event.capacity()) {
      throw conflict("event_full", "No places are available for this event.");
    }
    Participation resolved =
        participations
            .resolve(p.id(), target, now, p.version())
            .orElseThrow(
                () ->
                    new BusinessException(
                        HttpStatus.PRECONDITION_FAILED,
                        "concurrent_update",
                        "The request has changed since it was retrieved."));
    // Phase 4: record a notification for the requester.
    return resolved;
  }

  /**
   * The creator's paginated listing of an event's participants. {@code statusFilter} is {@code
   * confirmed} (default) or {@code pending} — the latter lets the creator find requests to approve
   * before the Phase 4 notifications exist.
   */
  public ParticipantListPage listForCreator(
      Jwt jwt, UUID eventId, String statusFilter, String cursorToken, int limitRaw) {
    AppUser user = currentUsers.requireActive(jwt);
    Event event = events.loadOrNotFound(eventId);
    if (!event.creatorId().equals(user.id())) {
      throw notFound();
    }
    ParticipationStatus status =
        switch (statusFilter == null ? "confirmed" : statusFilter) {
          case "confirmed" -> ParticipationStatus.CONFIRMED;
          case "pending" -> ParticipationStatus.PENDING;
          default ->
              throw new BusinessException(
                  HttpStatus.BAD_REQUEST, "validation_error", "Unsupported status filter.");
        };
    int limit = Math.clamp(limitRaw, 1, 50);
    int scopeHash = Objects.hash(eventId, status);
    KeysetCursor cursor =
        cursorToken == null || cursorToken.isBlank()
            ? null
            : KeysetCursor.decode(cursorToken, scopeHash);
    List<ParticipationRepository.ParticipantRow> rows =
        participations.listByStatus(
            eventId,
            status,
            cursor == null ? null : cursor.timestamp(),
            cursor == null ? null : cursor.id(),
            limit + 1);
    boolean hasMore = rows.size() > limit;
    List<ParticipationRepository.ParticipantRow> pageRows = hasMore ? rows.subList(0, limit) : rows;
    List<ListedParticipant> items =
        pageRows.stream()
            .map(
                row ->
                    new ListedParticipant(
                        row.participationId(),
                        new PublicProfile(row.userId(), row.alias()),
                        status.label(),
                        row.requestedAt()))
            .toList();
    String nextCursor = null;
    if (hasMore && !pageRows.isEmpty()) {
      ParticipationRepository.ParticipantRow last = pageRows.get(pageRows.size() - 1);
      nextCursor = KeysetCursor.encode(scopeHash, null, last.requestedAt(), last.participationId());
    }
    return new ParticipantListPage(items, nextCursor);
  }

  public String etag(Participation participation) {
    return "\"participation-" + participation.version() + "\"";
  }

  private void requireIfMatch(Participation participation, String ifMatch) {
    if (ifMatch == null || ifMatch.isBlank()) {
      throw new BusinessException(
          HttpStatus.PRECONDITION_REQUIRED,
          "if_match_required",
          "If-Match is required to resolve a request.");
    }
    if (!etag(participation).equals(ifMatch)) {
      throw new BusinessException(
          HttpStatus.PRECONDITION_FAILED,
          "concurrent_update",
          "The request has changed since it was retrieved.");
    }
  }

  private BusinessException notFound() {
    return new BusinessException(
        HttpStatus.NOT_FOUND, "not_found", "The resource does not exist or is not visible.");
  }

  private static BusinessException conflict(String code, String detail) {
    return new BusinessException(HttpStatus.CONFLICT, code, detail);
  }

  public record ListedParticipant(
      UUID participationId, PublicProfile user, String status, Instant requestedAt) {}

  public record ParticipantListPage(List<ListedParticipant> items, String nextCursor) {}
}
