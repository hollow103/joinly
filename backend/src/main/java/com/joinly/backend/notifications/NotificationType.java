package com.joinly.backend.notifications;

/**
 * The push notification kinds the pilot delivers. {@link #dbValue()} is stored in {@code
 * notifications.type}; {@link #preferenceKey()} matches the per-type flags the mobile client keeps
 * in {@code push_devices.preferences} (mobile {@code src/lib/push-settings.ts}). An absent
 * preference key means opted in.
 */
public enum NotificationType {
  PARTICIPATION_REQUESTED("participation_requested", "requests"),
  PARTICIPATION_APPROVED("participation_approved", "decisions"),
  PARTICIPATION_REJECTED("participation_rejected", "decisions"),
  EVENT_CHANGED("event_changed", "changes"),
  EVENT_CANCELLED("event_cancelled", "cancellations");

  private final String dbValue;
  private final String preferenceKey;

  NotificationType(String dbValue, String preferenceKey) {
    this.dbValue = dbValue;
    this.preferenceKey = preferenceKey;
  }

  public String dbValue() {
    return dbValue;
  }

  public String preferenceKey() {
    return preferenceKey;
  }

  public static NotificationType fromDbValue(String value) {
    for (NotificationType type : values()) {
      if (type.dbValue.equals(value)) {
        return type;
      }
    }
    throw new IllegalArgumentException("Unknown notification type: " + value);
  }
}
