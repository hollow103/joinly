package com.joinly.backend.moderation;

public enum ReportTargetType {
  USER("user"),
  EVENT("event");

  private final String apiValue;

  ReportTargetType(String apiValue) {
    this.apiValue = apiValue;
  }

  public String apiValue() {
    return apiValue;
  }
}
