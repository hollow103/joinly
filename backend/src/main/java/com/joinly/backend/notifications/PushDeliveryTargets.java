package com.joinly.backend.notifications;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Port the {@code notifications} module uses to read and prune push devices it does not own.
 * Implemented by the {@code users} module ({@code PushDeliveryDirectory}), so {@code notifications}
 * never imports {@code users} and there is no cycle.
 */
public interface PushDeliveryTargets {

  Optional<PushTarget> forRecipient(UUID userId);

  /** Drops a token Expo reported as unregistered so later notifications skip it. */
  void forgetToken(UUID userId, String expoPushToken);

  record PushTarget(String expoPushToken, boolean enabled, Map<String, Boolean> preferences) {

    /** Whether this device should receive the given type right now. */
    public boolean accepts(NotificationType type) {
      return enabled
          && expoPushToken != null
          && !expoPushToken.isBlank()
          && preferences.getOrDefault(type.preferenceKey(), Boolean.TRUE);
    }
  }
}
