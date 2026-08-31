package com.joinly.backend.events;

import java.util.Arrays;

/** Access mode of an event, mapping between the API name and the database enum label. */
public enum AccessMode {
  DIRECT("direct", "direct"),
  APPROVAL("approval", "approval"),
  PRIVATE_INVITATION("privateInvitation", "private_invitation");

  private final String apiValue;
  private final String dbValue;

  AccessMode(String apiValue, String dbValue) {
    this.apiValue = apiValue;
    this.dbValue = dbValue;
  }

  public String apiValue() {
    return apiValue;
  }

  public String dbValue() {
    return dbValue;
  }

  public static AccessMode fromApi(String value) {
    return Arrays.stream(values())
        .filter(mode -> mode.apiValue.equals(value))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Unknown access mode: " + value));
  }

  public static AccessMode fromDb(String value) {
    return Arrays.stream(values())
        .filter(mode -> mode.dbValue.equals(value))
        .findFirst()
        .orElseThrow(() -> new IllegalStateException("Unknown access mode in database: " + value));
  }
}
