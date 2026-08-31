package com.joinly.backend.users;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Single source of truth for the currently required agreement versions. Both profile upsert and the
 * eligibility checks for product operations consult it, so the pilot only has to change the
 * configured versions in one place.
 */
@Component
public class AgreementPolicy {

  private final String termsVersion;
  private final String privacyVersion;
  private final String guidelinesVersion;

  public AgreementPolicy(
      @Value("${joinly.agreements.terms-version}") String termsVersion,
      @Value("${joinly.agreements.privacy-version}") String privacyVersion,
      @Value("${joinly.agreements.guidelines-version}") String guidelinesVersion) {
    this.termsVersion = termsVersion;
    this.privacyVersion = privacyVersion;
    this.guidelinesVersion = guidelinesVersion;
  }

  public boolean accepted(AppUser user) {
    return termsVersion.equals(user.termsVersion())
        && privacyVersion.equals(user.privacyVersion())
        && guidelinesVersion.equals(user.guidelinesVersion());
  }

  public boolean matches(String terms, String privacy, String guidelines) {
    return termsVersion.equals(terms)
        && privacyVersion.equals(privacy)
        && guidelinesVersion.equals(guidelines);
  }
}
