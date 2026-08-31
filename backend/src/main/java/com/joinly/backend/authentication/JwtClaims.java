package com.joinly.backend.authentication;

import com.joinly.backend.shared.BusinessException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class JwtClaims {

  public UUID subject(Jwt jwt) {
    try {
      return UUID.fromString(jwt.getSubject());
    } catch (RuntimeException exception) {
      throw new BusinessException(
          HttpStatus.UNAUTHORIZED,
          "invalid_subject",
          "The token subject is not a valid identifier.");
    }
  }
}
