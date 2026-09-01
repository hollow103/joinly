package com.joinly.backend.moderation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ModerationController {

  private static final String TARGET_TYPE_PATTERN = "user|event";
  private static final String REASON_PATTERN =
      "inappropriateContent|abusiveBehavior|fraudulentEvent|misleadingLocation|other";
  private static final String DECISION_STATUS_PATTERN = "archived|resolved";
  private static final String ACTION_PATTERN = "none|hideEvent|warnUser|suspendUser";

  private final ModerationService moderation;

  public ModerationController(ModerationService moderation) {
    this.moderation = moderation;
  }

  @PostMapping("/reports")
  ResponseEntity<CreatedReportResponse> create(
      @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateReportRequest request) {
    Report report = moderation.create(jwt, request.toCommand());
    return ResponseEntity.status(HttpStatus.CREATED)
        .eTag(moderation.etag(report))
        .body(new CreatedReportResponse(report.id(), report.status().value(), report.createdAt()));
  }

  @GetMapping("/admin/reports")
  ResponseEntity<ReportPageResponse> list(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(name = "status", required = false) String status,
      @RequestParam(name = "cursor", required = false) String cursor,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {
    ModerationService.ReportPage page = moderation.list(jwt, status, cursor, limit);
    return ResponseEntity.ok(
        new ReportPageResponse(
            page.items().stream().map(this::adminResponse).toList(),
            new PageInfo(page.nextCursor())));
  }

  @GetMapping("/admin/reports/{reportId}")
  ResponseEntity<AdminReportResponse> get(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID reportId) {
    Report report = moderation.get(jwt, reportId);
    return ResponseEntity.ok().eTag(moderation.etag(report)).body(adminResponse(report));
  }

  @PatchMapping("/admin/reports/{reportId}")
  ResponseEntity<AdminReportResponse> decide(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID reportId,
      @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch,
      @Valid @RequestBody ModerationDecisionRequest request) {
    Report report = moderation.decide(jwt, reportId, request.toCommand(), ifMatch);
    return ResponseEntity.ok().eTag(moderation.etag(report)).body(adminResponse(report));
  }

  private AdminReportResponse adminResponse(Report report) {
    return new AdminReportResponse(
        report.id(),
        report.reporterId(),
        report.targetType().apiValue(),
        report.targetId(),
        report.reason().apiValue(),
        report.description(),
        report.status().value(),
        report.decisionAction() == null ? null : report.decisionAction().apiValue(),
        report.decisionNote(),
        report.decidedBy(),
        report.decidedAt(),
        report.createdAt(),
        report.updatedAt());
  }

  public record CreateReportRequest(
      @NotBlank @Pattern(regexp = TARGET_TYPE_PATTERN) String targetType,
      @NotNull UUID targetId,
      @NotBlank @Pattern(regexp = REASON_PATTERN) String reason,
      @Size(max = 4000) String description) {

    ModerationService.CreateCommand toCommand() {
      return new ModerationService.CreateCommand(
          "user".equals(targetType) ? ReportTargetType.USER : ReportTargetType.EVENT,
          targetId,
          switch (reason) {
            case "inappropriateContent" -> ReportReason.INAPPROPRIATE_CONTENT;
            case "abusiveBehavior" -> ReportReason.ABUSIVE_BEHAVIOR;
            case "fraudulentEvent" -> ReportReason.FRAUDULENT_EVENT;
            case "misleadingLocation" -> ReportReason.MISLEADING_LOCATION;
            default -> ReportReason.OTHER;
          },
          description == null || description.isBlank() ? null : description.trim());
    }
  }

  public record ModerationDecisionRequest(
      @NotBlank @Pattern(regexp = DECISION_STATUS_PATTERN) String status,
      @NotBlank @Pattern(regexp = ACTION_PATTERN) String action,
      @Size(max = 4000) String note) {

    ModerationService.DecisionCommand toCommand() {
      return new ModerationService.DecisionCommand(
          "archived".equals(status) ? ReportStatus.ARCHIVED : ReportStatus.RESOLVED,
          switch (action) {
            case "hideEvent" -> ModerationAction.HIDE_EVENT;
            case "warnUser" -> ModerationAction.WARN_USER;
            case "suspendUser" -> ModerationAction.SUSPEND_USER;
            default -> ModerationAction.NONE;
          },
          note == null || note.isBlank() ? null : note.trim());
    }
  }

  public record CreatedReportResponse(UUID id, String status, Instant createdAt) {}

  public record AdminReportResponse(
      UUID id,
      UUID reporterId,
      String targetType,
      UUID targetId,
      String reason,
      String description,
      String status,
      String action,
      String note,
      UUID decidedBy,
      Instant decidedAt,
      Instant createdAt,
      Instant updatedAt) {}

  public record PageInfo(String nextCursor) {}

  public record ReportPageResponse(List<AdminReportResponse> items, PageInfo page) {}
}
