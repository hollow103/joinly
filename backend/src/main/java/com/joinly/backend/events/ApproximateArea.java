package com.joinly.backend.events;

import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Derives the public "approximate area" label from an exact location. The MVP avoids external
 * geocoding services, so the label is the exact point rounded to a coarse grid (~1.1 km at two
 * decimals). This is the only place the area is produced; the client never supplies it.
 */
@Component
public class ApproximateArea {

  private static final double GRID = 100.0; // two decimal places

  public String describe(double longitude, double latitude) {
    double roundedLat = Math.round(latitude * GRID) / GRID;
    double roundedLon = Math.round(longitude * GRID) / GRID;
    return String.format(Locale.ROOT, "Zona aproximada %.2f, %.2f", roundedLat, roundedLon);
  }
}
