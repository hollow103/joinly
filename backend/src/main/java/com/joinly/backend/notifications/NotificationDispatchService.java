package com.joinly.backend.notifications;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Delivers recorded notifications through Expo. Runs on {@code joinly.notifications.dispatch-cron}
 * (disable the trigger with {@code -}); {@code joinly.notifications.dispatch-enabled} is a runtime
 * kill switch. Each pass claims a bounded batch with {@code FOR UPDATE SKIP LOCKED}, so repeated or
 * overlapping runs never double-send.
 *
 * <p>One attempt per notification: a send marks it {@code sent}; any Expo error marks it {@code
 * failed} with no retry; a {@code DeviceNotRegistered} answer also prunes the stale token. A
 * recipient with no device, delivery disabled or the type muted is completed as {@code sent} with
 * nothing sent. HTTP happens while the batch rows are locked; the batch size is deliberately small
 * because a dedicated worker or queue is out of MVP scope (docs/16 Fase 6).
 */
@Service
public class NotificationDispatchService {

  private static final Logger log = LoggerFactory.getLogger(NotificationDispatchService.class);
  private static final String TITLE = "Joinly";

  private final NotificationRepository notifications;
  private final PushDeliveryTargets targets;
  private final ExpoPushClient expo;
  private final Clock clock;
  private final boolean enabled;
  private final int batchSize;

  public NotificationDispatchService(
      NotificationRepository notifications,
      PushDeliveryTargets targets,
      ExpoPushClient expo,
      Clock clock,
      @Value("${joinly.notifications.dispatch-enabled:true}") boolean enabled,
      @Value("${joinly.notifications.batch-size:50}") int batchSize) {
    this.notifications = notifications;
    this.targets = targets;
    this.expo = expo;
    this.clock = clock;
    this.enabled = enabled;
    this.batchSize = batchSize;
  }

  @Scheduled(cron = "${joinly.notifications.dispatch-cron:0 * * * * *}")
  @Transactional
  public void dispatchDue() {
    if (!enabled) {
      return;
    }
    for (NotificationRepository.Pending pending : notifications.claimPending(batchSize)) {
      deliver(pending);
    }
  }

  private void deliver(NotificationRepository.Pending pending) {
    Instant now = Instant.now(clock);
    Optional<PushDeliveryTargets.PushTarget> maybeTarget =
        targets.forRecipient(pending.recipientId());
    if (maybeTarget.isEmpty() || !maybeTarget.get().accepts(pending.type())) {
      notifications.markSent(pending.id(), now);
      return;
    }
    PushDeliveryTargets.PushTarget target = maybeTarget.get();
    ExpoPushClient.Result result =
        expo.send(target.expoPushToken(), TITLE, body(pending.type()), payload(pending));
    switch (result) {
      case OK -> notifications.markSent(pending.id(), now);
      case DEVICE_NOT_REGISTERED -> {
        targets.forgetToken(pending.recipientId(), target.expoPushToken());
        notifications.markFailed(pending.id());
      }
      case ERROR -> {
        log.warn("Expo push delivery failed for notification {}", pending.id());
        notifications.markFailed(pending.id());
      }
    }
  }

  private static String body(NotificationType type) {
    return switch (type) {
      case PARTICIPATION_REQUESTED -> "Tienes una nueva solicitud para unirse a tu plan.";
      case PARTICIPATION_APPROVED -> "Han aceptado tu solicitud para unirte a un plan.";
      case PARTICIPATION_REJECTED -> "Han rechazado tu solicitud para unirte a un plan.";
      case EVENT_CHANGED -> "Un plan en el que participas ha cambiado.";
      case EVENT_CANCELLED -> "Un plan en el que participas se ha cancelado.";
    };
  }

  private static Map<String, Object> payload(NotificationRepository.Pending pending) {
    Map<String, Object> data = new HashMap<>();
    data.put("type", pending.type().dbValue());
    if (pending.eventId() != null) {
      data.put("eventId", pending.eventId().toString());
    }
    if (pending.participationId() != null) {
      data.put("participationId", pending.participationId().toString());
    }
    return data;
  }
}
