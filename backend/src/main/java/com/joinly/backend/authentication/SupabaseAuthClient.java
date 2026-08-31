package com.joinly.backend.authentication;

import com.fasterxml.jackson.databind.JsonNode;
import com.joinly.backend.shared.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class SupabaseAuthClient {

  private final RestClient restClient;
  private final String userInfoUri;

  public SupabaseAuthClient(@Value("${joinly.security.user-info-uri}") String userInfoUri) {
    this.restClient = RestClient.create();
    this.userInfoUri = userInfoUri;
  }

  public boolean emailVerified(String accessToken) {
    try {
      JsonNode user =
          restClient
              .get()
              .uri(userInfoUri)
              .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
              .retrieve()
              .onStatus(
                  HttpStatusCode::isError,
                  (request, response) -> {
                    throw new BusinessException(
                        HttpStatus.UNAUTHORIZED,
                        "invalid_token",
                        "Supabase rejected the access token.");
                  })
              .body(JsonNode.class);
      return user != null && !user.path("email_confirmed_at").isNull();
    } catch (BusinessException exception) {
      throw exception;
    } catch (RestClientException exception) {
      throw new BusinessException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "identity_verification_unavailable",
          "Supabase user verification is temporarily unavailable.");
    }
  }
}
