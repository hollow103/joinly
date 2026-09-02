package com.joinly.backend.notifications;

import java.time.Instant;
import java.util.Collection;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Records the notifications a use case produces, inside the caller's transaction. Delivery is
 * asynchronous, repeatable and idempotent ({@link NotificationDispatchService}); recording never
 * blocks or changes the originating operation's response (docs/11-contrato-api.md, "Notificaciones
 * y efectos secundarios").
 *
 * <p>The {@code notifications} module is a sink: {@code events} and {@code participation} depend on
 * it, it depends on neither of them.
 */
@Service
public class NotificationRecorder {

  private final NotificationRepository notifications;

  public NotificationRecorder(NotificationRepository notifications) {
    this.notifications = notifications;
  }

  /** A join request awaiting the creator's approval. Direct joins produce nothing. */
  public void participationRequested(
      UUID creatorId, UUID eventId, UUID participationId, Instant now) {
    notifications.insert(
        NotificationType.PARTICIPATION_REQUESTED, creatorId, eventId, participationId, now);
  }

  /** The creator's decision on a pending request, sent to the requester. */
  public void participationDecided(
      UUID requesterId, UUID eventId, UUID participationId, boolean approved, Instant now) {
    NotificationType type =
        approved
            ? NotificationType.PARTICIPATION_APPROVED
            : NotificationType.PARTICIPATION_REJECTED;
    notifications.insert(type, requesterId, eventId, participationId, now);
  }

  /** A change to an event's main fields, for its confirmed participants only. */
  public void eventChanged(Collection<UUID> confirmedParticipantIds, UUID eventId, Instant now) {
    notifications.insertForRecipients(
        NotificationType.EVENT_CHANGED, confirmedParticipantIds, eventId, now);
  }

  /** An event cancellation, for its confirmed participants only. */
  public void eventCancelled(Collection<UUID> confirmedParticipantIds, UUID eventId, Instant now) {
    notifications.insertForRecipients(
        NotificationType.EVENT_CANCELLED, confirmedParticipantIds, eventId, now);
  }
}
