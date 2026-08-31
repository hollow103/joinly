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
  private final AgreementPolicy agreements;

  public CurrentUserService(
      UserRepository users,
      JwtClaims claims,
      SupabaseAuthClient supabaseAuth,
      Clock clock,
      AgreementPolicy agreements) {
    this.users = users;
    this.claims = claims;
    this.supabaseAuth = supabaseAuth;
    this.clock = clock;
    this.agreements = agreements;
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

  /**
   * Active account that additionally has a verified email and has accepted the current agreements.
   * Required to create, edit or cancel events and (from Phase 3) to participate.
   */
  public AppUser requireEligibleForEvents(Jwt jwt) {
    AppUser user = requireActive(jwt);
    if (!user.emailVerified()) {
      throw new BusinessException(
          HttpStatus.FORBIDDEN,
          "email_not_verified",
          "Verify your email address before creating events or participating.");
    }
    if (!agreements.accepted(user)) {
      throw new BusinessException(
          HttpStatus.FORBIDDEN,
          "agreements_not_accepted",
          "Accept the current agreements before creating events or participating.");
    }
    return user;
  }
}
