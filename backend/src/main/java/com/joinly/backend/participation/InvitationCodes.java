package com.joinly.backend.participation;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.stereotype.Component;

/**
 * Generates invitation codes and hashes them for storage. The plaintext code is returned to the
 * creator once and never persisted; only the SHA-256 hex digest is stored in {@code code_hash}.
 */
@Component
public class InvitationCodes {

  private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();

  private final SecureRandom random = new SecureRandom();

  public String generate() {
    byte[] bytes = new byte[24];
    random.nextBytes(bytes);
    return ENCODER.encodeToString(bytes);
  }

  public String hash(String code) {
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256").digest(code.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is required", exception);
    }
  }
}
