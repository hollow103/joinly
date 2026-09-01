package com.joinly.backend.moderation;

import com.joinly.backend.shared.BusinessException;
import org.springframework.http.HttpStatus;

public enum ReportReason {
  INAPPROPRIATE_CONTENT("inappropriateContent", "inappropriate_content"),
  ABUSIVE_BEHAVIOR("abusiveBehavior", "abusive_behavior"),
  FRAUDULENT_EVENT("fraudulentEvent", "fraudulent_event"),
  MISLEADING_LOCATION("misleadingLocation", "misleading_location"),
  OTHER("other", "other");

  private final String apiValue;
  private final String dbValue;

  ReportReason(String apiValue, String dbValue) {
    this.apiValue = apiValue;
    this.dbValue = dbValue;
  }

  public String apiValue() {
    return apiValue;
  }

  public String dbValue() {
    return dbValue;
  }

  public static ReportReason fromDb(String value) {
    for (ReportReason reason : values()) {
      if (reason.dbValue.equals(value)) {
        return reason;
      }
    }
    throw new BusinessException(
        HttpStatus.INTERNAL_SERVER_ERROR, "invalid_report_reason", "Invalid report reason.");
  }
}
