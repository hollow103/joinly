package com.joinly.backend.users;

import com.joinly.backend.notifications.PushDeliveryTargets;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Implements the {@code notifications} module's read port over {@code push_devices}, which the
 * {@code users} module owns. Keeps the dependency arrow users → notifications.
 */
@Component
public class PushDeliveryDirectory implements PushDeliveryTargets {

  private final PushSettingsRepository devices;

  public PushDeliveryDirectory(PushSettingsRepository devices) {
    this.devices = devices;
  }

  @Override
  public Optional<PushTarget> forRecipient(UUID userId) {
    return devices
        .findByUser(userId)
        .map(s -> new PushTarget(s.expoPushToken(), s.enabled(), s.preferences()));
  }

  @Override
  public void forgetToken(UUID userId, String expoPushToken) {
    devices.clearToken(userId, expoPushToken);
  }
}
