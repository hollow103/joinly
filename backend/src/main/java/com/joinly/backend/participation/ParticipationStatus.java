package com.joinly.backend.participation;

import java.util.Locale;

/** Lifecycle of a participation. API and database labels are identical (lowercase). */
public enum ParticipationStatus {
  PENDING,
  CONFIRMED,
  REJECTED,
  ABANDONED;

  public String label() {
    return name().toLowerCase(Locale.ROOT);
  }

  public static ParticipationStatus fromDb(String value) {
    return valueOf(value.toUpperCase(Locale.ROOT));
  }
}
