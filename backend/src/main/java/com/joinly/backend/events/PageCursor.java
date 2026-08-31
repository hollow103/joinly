package com.joinly.backend.events;

import com.joinly.backend.shared.BusinessException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import org.springframework.http.HttpStatus;

/**
 * Opaque keyset cursor for the paginated event collections. It carries the tuple that the query
 * orders by ({@code sortValue}, {@code startsAt}, {@code id}) plus a hash of the scope (search
 * filters, or creator + status filter). A cursor built for a different scope, or a corrupted one,
 * is rejected with {@code 400 validation_error} so clients cannot craft or reuse it across queries.
 *
 * <p>{@code startsAt} is kept at full precision (not truncated to millis) so the comparison against
 * the microsecond-precision {@code timestamptz} column excludes exactly the boundary row.
 */
record PageCursor(Double sortValue, Instant startsAt, UUID lastId) {

  private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

  static String encode(int scopeHash, Double sortValue, Instant startsAt, UUID lastId) {
    String raw =
        scopeHash
            + "|"
            + (sortValue == null ? "" : Double.toString(sortValue))
            + "|"
            + startsAt
            + "|"
            + lastId;
    return ENCODER.encodeToString(raw.getBytes(StandardCharsets.UTF_8));
  }

  static PageCursor decode(String token, int scopeHash) {
    try {
      String raw = new String(DECODER.decode(token), StandardCharsets.UTF_8);
      String[] parts = raw.split("\\|", 4);
      if (parts.length != 4 || Integer.parseInt(parts[0]) != scopeHash) {
        throw new IllegalArgumentException("cursor does not match the current query");
      }
      Double sortValue = parts[1].isEmpty() ? null : Double.parseDouble(parts[1]);
      return new PageCursor(sortValue, Instant.parse(parts[2]), UUID.fromString(parts[3]));
    } catch (RuntimeException exception) {
      throw new BusinessException(
          HttpStatus.BAD_REQUEST, "validation_error", "The pagination cursor is invalid.");
    }
  }
}
