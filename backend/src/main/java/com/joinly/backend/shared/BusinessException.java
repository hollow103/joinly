package com.joinly.backend.shared;

import java.util.Map;
import org.springframework.http.HttpStatus;

public class BusinessException extends RuntimeException {

  private final HttpStatus status;
  private final String code;
  private final Map<String, String> fields;

  public BusinessException(HttpStatus status, String code, String detail) {
    this(status, code, detail, Map.of());
  }

  public BusinessException(
      HttpStatus status, String code, String detail, Map<String, String> fields) {
    super(detail);
    this.status = status;
    this.code = code;
    this.fields = Map.copyOf(fields);
  }

  public HttpStatus status() {
    return status;
  }

  public String code() {
    return code;
  }

  public Map<String, String> fields() {
    return fields;
  }
}
