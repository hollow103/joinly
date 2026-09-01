package com.joinly.backend.moderation;

import com.joinly.backend.events.EventService;
import com.joinly.backend.shared.BusinessException;
import com.joinly.backend.shared.KeysetCursor;
import com.joinly.backend.users.AppUser;
import com.joinly.backend.users.CurrentUserService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ModerationService {

  private static final List<String> REPORT_STATUSES = List.of("pending", "archived", "resolved");
  private static final String DETAIL_FIELDS =
      "[\"reporterId\",\"targetId\",\"reason\",\"description\",\"decision\"]";
  private static final String DECISION_FIELDS = "[\"status\",\"action\",\"note\"]";

  private final ModerationRepository reports;
  private final CurrentUserService currentUsers;
  private final EventService events;
  private final Clock clock;

  public ModerationService(
      ModerationRepository reports,
      CurrentUserService currentUsers,
      EventService events,
      Clock clock) {
    this.reports = reports;
    this.currentUsers = currentUsers;
    this.events = events;
    this.clock = clock;
  }

  @Transactional
  public Report create(Jwt jwt, CreateCommand command) {
    AppUser reporter = currentUsers.requireActive(jwt);
    Instant now = Instant.now(clock);
    if (command.targetType() == ReportTargetType.EVENT) {
      events.get(jwt, command.targetId());
    } else if (!reports.userIsVisibleTo(reporter.id(), command.targetId(), now)) {
      throw notFound();
    }
    return reports.insert(
        new ModerationRepository.NewReport(
            reporter.id(),
            command.targetType() == ReportTargetType.USER ? command.targetId() : null,
            command.targetType() == ReportTargetType.EVENT ? command.targetId() : null,
            command.reason(),
            command.description()),
        now);
  }

  public ReportPage list(Jwt jwt, String statusValue, String cursorToken, int limitRaw) {
    currentUsers.requireAdmin(jwt);
    ReportStatus status = parseStatus(statusValue);
    int limit = Math.clamp(limitRaw, 1, 50);
    int scopeHash = Objects.hash(status == null ? null : status.value());
    KeysetCursor cursor =
        cursorToken == null || cursorToken.isBlank()
            ? null
            : KeysetCursor.decode(cursorToken, scopeHash);
    List<Report> rows = reports.findPage(status, cursor, limit + 1);
    boolean hasMore = rows.size() > limit;
    List<Report> items = hasMore ? rows.subList(0, limit) : rows;
    String nextCursor = null;
    if (hasMore && !items.isEmpty()) {
      Report last = items.get(items.size() - 1);
      nextCursor = KeysetCursor.encode(scopeHash, null, last.createdAt(), last.id());
    }
    return new ReportPage(items, nextCursor);
  }

  @Transactional
  public Report get(Jwt jwt, UUID reportId) {
    AppUser admin = currentUsers.requireAdmin(jwt);
    Report report = reports.findById(reportId).orElseThrow(this::notFound);
    reports.audit(
        report.id(), admin.id(), "report_viewed", DETAIL_FIELDS, null, Instant.now(clock));
    return report;
  }

  @Transactional
  public Report decide(Jwt jwt, UUID reportId, DecisionCommand command, String ifMatch) {
    AppUser admin = currentUsers.requireAdmin(jwt);
    Report report = reports.findById(reportId).orElseThrow(this::notFound);
    requireIfMatch(report, ifMatch);
    if (report.status() != ReportStatus.PENDING) {
      throw new BusinessException(
          HttpStatus.CONFLICT, "report_already_decided", "The report is already decided.");
    }
    validateAction(report.targetType(), command.action());
    if (command.status() == ReportStatus.ARCHIVED && command.action() != ModerationAction.NONE) {
      throw invalidField("action", "archived reports cannot apply a moderation action");
    }
    Instant now = Instant.now(clock);
    Report decided =
        reports
            .decide(
                reportId,
                report.version(),
                command.status(),
                command.action(),
                command.note(),
                admin.id(),
                now)
            .orElseThrow(
                () ->
                    new BusinessException(
                        HttpStatus.PRECONDITION_FAILED,
                        "concurrent_update",
                        "The report has changed since it was retrieved."));
    applyAction(decided, now);
    reports.audit(decided.id(), admin.id(), "report_decided", DECISION_FIELDS, command.note(), now);
    return decided;
  }

  public String etag(Report report) {
    return "\"report-" + report.version() + "\"";
  }

  private ReportStatus parseStatus(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    if (!REPORT_STATUSES.contains(value)) {
      throw new BusinessException(
          HttpStatus.BAD_REQUEST, "validation_error", "Unknown report status.");
    }
    return ReportStatus.fromDb(value);
  }

  private void requireIfMatch(Report report, String ifMatch) {
    if (ifMatch == null || ifMatch.isBlank()) {
      throw new BusinessException(
          HttpStatus.PRECONDITION_REQUIRED,
          "if_match_required",
          "If-Match is required when deciding a report.");
    }
    if (!etag(report).equals(ifMatch)) {
      throw new BusinessException(
          HttpStatus.PRECONDITION_FAILED,
          "concurrent_update",
          "The report has changed since it was retrieved.");
    }
  }

  private void validateAction(ReportTargetType targetType, ModerationAction action) {
    if (action == ModerationAction.HIDE_EVENT && targetType != ReportTargetType.EVENT) {
      throw invalidField("action", "hideEvent requires an event report");
    }
    if ((action == ModerationAction.WARN_USER || action == ModerationAction.SUSPEND_USER)
        && targetType != ReportTargetType.USER) {
      throw invalidField("action", action.apiValue() + " requires a user report");
    }
  }

  private void applyAction(Report report, Instant now) {
    if (report.decisionAction() == ModerationAction.HIDE_EVENT) {
      reports.hideEvent(report.reportedEventId(), now);
    }
    if (report.decisionAction() == ModerationAction.SUSPEND_USER) {
      reports.suspendUser(report.reportedUserId(), now);
    }
  }

  private BusinessException notFound() {
    return new BusinessException(
        HttpStatus.NOT_FOUND, "not_found", "The requested resource was not found.");
  }

  private BusinessException invalidField(String field, String message) {
    return new BusinessException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "validation_error",
        "The request contains invalid fields.",
        java.util.Map.of(field, message));
  }

  public record CreateCommand(
      ReportTargetType targetType, UUID targetId, ReportReason reason, String description) {}

  public record DecisionCommand(ReportStatus status, ModerationAction action, String note) {}

  public record ReportPage(List<Report> items, String nextCursor) {}
}
