package com.joinly.backend.participation;

import com.joinly.backend.events.AccessMode;
import com.joinly.backend.events.Event;
import com.joinly.backend.events.EventService;
import com.joinly.backend.shared.BusinessException;
import com.joinly.backend.users.AppUser;
import com.joinly.backend.users.CurrentUserService;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Secret invitation codes for {@code privateInvitation} events; only the creator manages them. */
@Service
public class InvitationService {

  private final InvitationRepository invitations;
  private final InvitationCodes codes;
  private final EventService events;
  private final CurrentUserService currentUsers;
  private final Clock clock;

  public InvitationService(
      InvitationRepository invitations,
      InvitationCodes codes,
      EventService events,
      CurrentUserService currentUsers,
      Clock clock) {
    this.invitations = invitations;
    this.codes = codes;
    this.events = events;
    this.currentUsers = currentUsers;
    this.clock = clock;
  }

  @Transactional
  public CreatedInvitation create(Jwt jwt, UUID eventId, Instant expiresAt, Integer maxUses) {
    AppUser user = currentUsers.requireEligibleForEvents(jwt);
    Instant now = Instant.now(clock);
    Event event = events.loadOrNotFound(eventId);
    if (!event.creatorId().equals(user.id())) {
      throw notFound();
    }
    if (event.accessMode() != AccessMode.PRIVATE_INVITATION) {
      throw new BusinessException(
          HttpStatus.CONFLICT, "event_not_private", "The event does not use private invitations.");
    }
    if (!event.startsInTheFuture(now)) {
      throw new BusinessException(
          HttpStatus.CONFLICT, "event_not_joinable", "The event has already started.");
    }
    if (expiresAt != null && !expiresAt.isAfter(now)) {
      throw new BusinessException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "validation_error",
          "The request contains invalid fields.",
          Map.of("expiresAt", "must be in the future"));
    }
    String code = codes.generate();
    UUID id = invitations.insert(eventId, user.id(), codes.hash(code), maxUses, expiresAt, now);
    return new CreatedInvitation(id, code, expiresAt, maxUses);
  }

  @Transactional
  public void revoke(Jwt jwt, UUID eventId, UUID invitationId) {
    AppUser user = currentUsers.requireEligibleForEvents(jwt);
    Event event = events.loadOrNotFound(eventId);
    if (!event.creatorId().equals(user.id())) {
      throw notFound();
    }
    invitations.revoke(eventId, invitationId, Instant.now(clock)); // idempotent
  }

  private static BusinessException notFound() {
    return new BusinessException(
        HttpStatus.NOT_FOUND, "not_found", "The event does not exist or is not visible.");
  }

  public record CreatedInvitation(UUID id, String code, Instant expiresAt, Integer maxUses) {}
}
