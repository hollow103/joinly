package com.joinly.backend.users;

import com.joinly.backend.authentication.JwtClaims;
import com.joinly.backend.authentication.SupabaseAuthClient;
import com.joinly.backend.shared.BusinessException;
import java.time.Clock;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

  private final UserRepository users;
  private final JwtClaims claims;
  private final SupabaseAuthClient supabaseAuth;
  private final Clock clock;

  public CurrentUserService(
      UserRepository users, JwtClaims claims, SupabaseAuthClient supabaseAuth, Clock clock) {
    this.users = users;
    this.claims = claims;
    this.supabaseAuth = supabaseAuth;
    this.clock = clock;
  }

  public AppUser requireActive(Jwt jwt) {
    AppUser user =
        users
            .findByAuthSubject(claims.subject(jwt))
            .orElseThrow(
                () ->
                    new BusinessException(
                        HttpStatus.FORBIDDEN,
                        "profile_required",
                        "Create the internal profile before using Joinly."));
    if (!"active".equals(user.status())) {
      throw new BusinessException(
          HttpStatus.FORBIDDEN, "account_suspended", "The account cannot use product operations.");
    }
    boolean emailVerified = supabaseAuth.emailVerified(jwt.getTokenValue());
    if (emailVerified != user.emailVerified()) {
      users.synchronizeEmailVerified(user.id(), emailVerified, Instant.now(clock));
      user = users.findByAuthSubject(user.authSubject()).orElseThrow();
    }
    return user;
  }
}
