package com.joinly.backend.users;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class PushSettingsService {

  private final CurrentUserService currentUsers;
  private final PushSettingsRepository settings;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public PushSettingsService(
      CurrentUserService currentUsers,
      PushSettingsRepository settings,
      ObjectMapper objectMapper,
      Clock clock) {
    this.currentUsers = currentUsers;
    this.settings = settings;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  public Settings update(Jwt jwt, Settings input) {
    AppUser user = currentUsers.requireActive(jwt);
    String preferences;
    try {
      preferences = objectMapper.writeValueAsString(input.preferences());
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Push settings could not be serialized.", exception);
    }
    return settings.upsert(
        user.id(), input.enabled(), input.expoPushToken(), preferences, Instant.now(clock));
  }

  public record Settings(boolean enabled, String expoPushToken, Map<String, Boolean> preferences) {}
}
