package com.joinly.backend.events;

import java.util.Arrays;

/** The six MVP event categories, mapping between the API name and the database enum label. */
public enum EventCategory {
  SPORT_WELLBEING("sportWellbeing", "sport_wellbeing"),
  CULTURE_LEISURE("cultureLeisure", "culture_leisure"),
  LEARNING("learning", "learning"),
  COMMUNITY_VOLUNTEERING("communityVolunteering", "community_volunteering"),
  PETS("pets", "pets"),
  NETWORKING("networking", "networking");

  private final String apiValue;
  private final String dbValue;

  EventCategory(String apiValue, String dbValue) {
    this.apiValue = apiValue;
    this.dbValue = dbValue;
  }

  public String apiValue() {
    return apiValue;
  }

  public String dbValue() {
    return dbValue;
  }

  /**
   * The request layer already constrains the value with a pattern; this is a defensive fallback.
   */
  public static EventCategory fromApi(String value) {
    return Arrays.stream(values())
        .filter(category -> category.apiValue.equals(value))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Unknown event category: " + value));
  }

  public static EventCategory fromDb(String value) {
    return Arrays.stream(values())
        .filter(category -> category.dbValue.equals(value))
        .findFirst()
        .orElseThrow(
            () -> new IllegalStateException("Unknown event category in database: " + value));
  }
}
