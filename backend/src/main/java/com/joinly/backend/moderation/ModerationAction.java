package com.joinly.backend.moderation;

import com.joinly.backend.shared.BusinessException;
import org.springframework.http.HttpStatus;

public enum ModerationAction {
  NONE("none", "none"),
  HIDE_EVENT("hideEvent", "hide_event"),
  WARN_USER("warnUser", "warn_user"),
  SUSPEND_USER("suspendUser", "suspend_user");

  private final String apiValue;
  private final String dbValue;

  ModerationAction(String apiValue, String dbValue) {
    this.apiValue = apiValue;
    this.dbValue = dbValue;
  }

  public String apiValue() {
    return apiValue;
  }

  public String dbValue() {
    return dbValue;
  }

  public static ModerationAction fromDb(String value) {
    for (ModerationAction action : values()) {
      if (action.dbValue.equals(value)) {
        return action;
      }
    }
    throw new BusinessException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "invalid_moderation_action",
        "Invalid moderation action.");
  }
}
