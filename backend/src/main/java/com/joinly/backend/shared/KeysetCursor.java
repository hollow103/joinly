package com.joinly.backend.shared;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import org.springframework.http.HttpStatus;

/**
 * Opaque keyset cursor for paginated collections. Carries the ordering tuple ({@code sortKey},
 * {@code timestamp}, {@code id}) plus a hash of the query scope, so a cursor cannot be crafted by
 * clients or reused across a different query. {@code sortKey} is optional (null for collections
 * ordered only by timestamp then id); it must not contain {@code '|'}. The timestamp is kept at
 * full precision so the comparison against a microsecond {@code timestamptz} column excludes
 * exactly the boundary row. A corrupted or foreign cursor yields {@code 400 validation_error}.
 */
public record KeysetCursor(String sortKey, Instant timestamp, UUID id) {

  private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

  public static String encode(int scopeHash, String sortKey, Instant timestamp, UUID id) {
    String raw = scopeHash + "|" + (sortKey == null ? "" : sortKey) + "|" + timestamp + "|" + id;
    return ENCODER.encodeToString(raw.getBytes(StandardCharsets.UTF_8));
  }

  public static KeysetCursor decode(String token, int scopeHash) {
    try {
      String raw = new String(DECODER.decode(token), StandardCharsets.UTF_8);
      String[] parts = raw.split("\\|", 4);
      if (parts.length != 4 || Integer.parseInt(parts[0]) != scopeHash) {
        throw new IllegalArgumentException("cursor does not match the current query");
      }
      return new KeysetCursor(
          parts[1].isEmpty() ? null : parts[1], Instant.parse(parts[2]), UUID.fromString(parts[3]));
    } catch (RuntimeException exception) {
      throw new BusinessException(
          HttpStatus.BAD_REQUEST, "validation_error", "The pagination cursor is invalid.");
    }
  }
}
