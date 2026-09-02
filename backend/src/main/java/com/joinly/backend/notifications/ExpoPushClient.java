package com.joinly.backend.notifications;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Minimal Expo Push Service client: one HTTP POST per notification, which is enough for pilot
 * volume. Expo receipts, batching and delivery retries are deferred. The call is unauthenticated
 * unless {@code joinly.notifications.expo-access-token} is set (Expo "Enhanced Security").
 */
@Component
public class ExpoPushClient {

  private final RestClient restClient;
  private final String endpoint;
  private final String accessToken;

  public ExpoPushClient(
      @Value("${joinly.notifications.expo-endpoint}") String endpoint,
      @Value("${joinly.notifications.expo-access-token:}") String accessToken,
      @Value("${joinly.notifications.expo-connect-timeout:2s}") Duration connectTimeout,
      @Value("${joinly.notifications.expo-read-timeout:5s}") Duration readTimeout) {
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(connectTimeout);
    requestFactory.setReadTimeout(readTimeout);
    this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    this.endpoint = endpoint;
    this.accessToken = accessToken;
  }

  public Result send(String expoPushToken, String title, String body, Map<String, Object> data) {
    Map<String, Object> message =
        Map.of("to", expoPushToken, "title", title, "body", body, "data", data);
    try {
      RestClient.RequestBodySpec request =
          restClient
              .post()
              .uri(endpoint)
              .contentType(MediaType.APPLICATION_JSON)
              .accept(MediaType.APPLICATION_JSON);
      if (StringUtils.hasText(accessToken)) {
        request = request.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
      }
      JsonNode response = request.body(List.of(message)).retrieve().body(JsonNode.class);
      return interpret(response);
    } catch (RestClientException exception) {
      return Result.ERROR;
    }
  }

  private Result interpret(JsonNode response) {
    if (response == null) {
      return Result.ERROR;
    }
    JsonNode data = response.path("data");
    JsonNode ticket = data.isArray() ? data.path(0) : data;
    if ("ok".equals(ticket.path("status").asText(""))) {
      return Result.OK;
    }
    if ("DeviceNotRegistered".equals(ticket.path("details").path("error").asText(""))) {
      return Result.DEVICE_NOT_REGISTERED;
    }
    return Result.ERROR;
  }

  public enum Result {
    OK,
    DEVICE_NOT_REGISTERED,
    ERROR
  }
}
