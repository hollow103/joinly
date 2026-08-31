package com.joinly.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.joinly.backend.users.ProfileController.UpsertProfileRequest;
import org.junit.jupiter.api.Test;

class ProfileRequestTest {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void distinguishesAnAbsentManualSearchAreaFromAnExplicitNull() throws Exception {
    UpsertProfileRequest absent =
        objectMapper.readValue(profileJson(""), UpsertProfileRequest.class);
    UpsertProfileRequest cleared =
        objectMapper.readValue(
            profileJson(",\"manualSearchArea\":null"), UpsertProfileRequest.class);

    assertThat(absent.hasManualSearchArea()).isFalse();
    assertThat(cleared.hasManualSearchArea()).isTrue();
    assertThat(cleared.manualSearchArea()).isNull();
  }

  private String profileJson(String manualSearchArea) {
    return """
        {"alias":"joinlyTestUser","adultConfirmed":true,"termsVersion":"v1","privacyVersion":"v1","guidelinesVersion":"v1"%s}
        """
        .formatted(manualSearchArea);
  }
}
