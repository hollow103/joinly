package com.joinly.backend.moderation;

import com.joinly.backend.shared.BusinessException;
import org.springframework.http.HttpStatus;

public enum ReportStatus {
  PENDING("pending"),
  ARCHIVED("archived"),
  RESOLVED("resolved");

  private final String value;

  ReportStatus(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }

  public static ReportStatus fromDb(String value) {
    for (ReportStatus status : values()) {
      if (status.value.equals(value)) {
        return status;
      }
    }
    throw new BusinessException(
        HttpStatus.INTERNAL_SERVER_ERROR, "invalid_report_status", "Invalid report status.");
  }
}
