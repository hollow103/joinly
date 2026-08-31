package com.joinly.backend.events;

import com.joinly.backend.shared.BusinessException;
import com.joinly.backend.users.AppUser;
import com.joinly.backend.users.CurrentUserService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use-case rules and transaction boundaries for events. Identity and account eligibility come from
 * {@link CurrentUserService}; projection decisions come from {@link EventVisibility}. Concurrent
 * edits are guarded by the {@code version} column and the {@code If-Match} / {@code ETag} contract.
 */
@Service
public class EventService {

  private static final int MAX_ACTIVE_EVENTS = 3;
  private static final int MAX_RADIUS_METERS = 50_000;
  private static final List<String> OWN_EVENT_STATUSES =
      List.of("published", "cancelled", "closed");

  private final EventRepository events;
  private final CurrentUserService currentUsers;
  private final ApproximateArea approximateArea;
  private final EventVisibility visibility;
  private final Clock clock;

  public EventService(
      EventRepository events,
      CurrentUserService currentUsers,
      ApproximateArea approximateArea,
      EventVisibility visibility,
      Clock clock) {
    this.events = events;
    this.currentUsers = currentUsers;
    this.approximateArea = approximateArea;
    this.visibility = visibility;
    this.clock = clock;
  }

  @Transactional
  public EventView create(Jwt jwt, CreateCommand cmd) {
    AppUser creator = currentUsers.requireEligibleForEvents(jwt);
    Instant now = Instant.now(clock);
    if (!cmd.startsAt().isAfter(now)) {
      throw invalidField("startsAt", "must be in the future");
    }
    if (events.countActiveByCreator(creator.id(), now) >= MAX_ACTIVE_EVENTS) {
      throw new BusinessException(
          HttpStatus.CONFLICT,
          "active_event_limit_reached",
          "You already have three active events.");
    }
    String area = approximateArea.describe(cmd.longitude(), cmd.latitude());
    Event created =
        events.insert(
            new EventRepository.NewEvent(
                creator.id(),
                cmd.title(),
                cmd.description(),
                cmd.notes(),
                cmd.category(),
                cmd.startsAt(),
                cmd.durationMinutes(),
                cmd.longitude(),
                cmd.latitude(),
                area,
                cmd.capacity(),
                cmd.accessMode()),
            now);
    return new EventView(created, creator.id());
  }

  public EventView get(Jwt jwt, UUID id) {
    AppUser viewer = currentUsers.requireActive(jwt);
    Event event = events.findById(id).orElseThrow(visibility::notFound);
    visibility.assertVisible(event, viewer.id());
    return new EventView(event, viewer.id());
  }

  @Transactional
  public EventView update(Jwt jwt, UUID id, PatchCommand cmd, String ifMatch) {
    AppUser editor = currentUsers.requireEligibleForEvents(jwt);
    Instant now = Instant.now(clock);
    Event current = events.findById(id).orElseThrow(visibility::notFound);
    if (!visibility.isCreator(current, editor.id())) {
      throw visibility.notFound();
    }
    requireIfMatch(current, ifMatch);
    if (!current.isPublished()) {
      throw new BusinessException(
          HttpStatus.CONFLICT, "event_not_editable", "The event can no longer be edited.");
    }
    if (cmd.isEmpty()) {
      throw new BusinessException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "validation_error",
          "At least one field must be provided.");
    }

    String title = cmd.title() != null ? cmd.title() : current.title();
    String description = cmd.description() != null ? cmd.description() : current.description();
    EventCategory category = cmd.category() != null ? cmd.category() : current.category();
    Instant startsAt = cmd.startsAt() != null ? cmd.startsAt() : current.startsAt();
    int durationMinutes =
        cmd.durationMinutes() != null ? cmd.durationMinutes() : current.durationMinutes();
    double longitude = cmd.longitude() != null ? cmd.longitude() : current.longitude();
    double latitude = cmd.latitude() != null ? cmd.latitude() : current.latitude();
    AccessMode accessMode = cmd.accessMode() != null ? cmd.accessMode() : current.accessMode();
    Integer capacity = cmd.capacityProvided() ? cmd.capacity() : current.capacity();
    String notes = cmd.notesProvided() ? cmd.notes() : current.notes();

    boolean locationChanged = longitude != current.longitude() || latitude != current.latitude();
    boolean mainFieldsChanged =
        !title.equals(current.title())
            || !description.equals(current.description())
            || category != current.category()
            || !startsAt.equals(current.startsAt())
            || durationMinutes != current.durationMinutes()
            || locationChanged
            || accessMode != current.accessMode()
            || !Objects.equals(capacity, current.capacity());
    boolean notesChanged = !Objects.equals(notes, current.notes());

    if (mainFieldsChanged && !current.startsInTheFuture(now)) {
      throw new BusinessException(
          HttpStatus.CONFLICT,
          "event_not_editable",
          "Only notes can be changed once the event has started.");
    }
    if (notesChanged && current.hasEnded(now)) {
      throw new BusinessException(
          HttpStatus.CONFLICT,
          "event_not_editable",
          "Notes can no longer be changed after the event has ended.");
    }
    if (!startsAt.equals(current.startsAt()) && !startsAt.isAfter(now)) {
      throw invalidField("startsAt", "must be in the future");
    }
    // Phase 3: reject a capacity below the confirmed participation count (409
    // capacity_below_confirmed).

    String area =
        locationChanged ? approximateArea.describe(longitude, latitude) : current.approximateArea();

    Event updated =
        events
            .update(
                new EventRepository.EventState(
                    id,
                    title,
                    description,
                    notes,
                    category,
                    startsAt,
                    durationMinutes,
                    longitude,
                    latitude,
                    area,
                    capacity,
                    accessMode),
                current.version(),
                now)
            .orElseThrow(
                () ->
                    new BusinessException(
                        HttpStatus.PRECONDITION_FAILED,
                        "concurrent_update",
                        "The event has changed since it was retrieved."));
    return new EventView(updated, editor.id());
  }

  @Transactional
  public void cancel(Jwt jwt, UUID id) {
    AppUser actor = currentUsers.requireEligibleForEvents(jwt);
    Instant now = Instant.now(clock);
    Event current = events.findById(id).orElseThrow(visibility::notFound);
    if (!visibility.isCreator(current, actor.id())) {
      throw visibility.notFound();
    }
    if (!current.isPublished() || !current.startsInTheFuture(now)) {
      throw new BusinessException(
          HttpStatus.CONFLICT, "event_not_cancellable", "The event can no longer be cancelled.");
    }
    if (!events.cancel(id, current.version(), now)) {
      throw new BusinessException(
          HttpStatus.PRECONDITION_FAILED,
          "concurrent_update",
          "The event has changed since it was retrieved.");
    }
    // Phase 3/4: notify confirmed participants of the cancellation.
  }

  public SearchResult search(Jwt jwt, SearchCommand cmd) {
    AppUser viewer = currentUsers.requireActive(jwt);
    Instant now = Instant.now(clock);
    int limit = Math.clamp(cmd.limit(), 1, 50);
    List<String> sortedCategories = cmd.categories().stream().sorted().toList();
    int scopeHash =
        Objects.hash(cmd.longitude(), cmd.latitude(), cmd.radiusMeters(), sortedCategories);
    PageCursor cursor = cmd.cursor() == null ? null : PageCursor.decode(cmd.cursor(), scopeHash);
    List<String> dbCategories =
        sortedCategories.stream().map(value -> EventCategory.fromApi(value).dbValue()).toList();

    List<EventRepository.EventWithDistance> rows =
        events.search(
            cmd.longitude(),
            cmd.latitude(),
            cmd.radiusMeters(),
            dbCategories,
            cursor,
            limit + 1,
            now);
    boolean hasMore = rows.size() > limit;
    List<EventRepository.EventWithDistance> pageRows = hasMore ? rows.subList(0, limit) : rows;

    List<DiscoveryRow> items =
        pageRows.stream()
            .map(row -> new DiscoveryRow(row.event(), roundToHundred(row.distanceMeters())))
            .toList();

    String nextCursor = null;
    if (hasMore && !pageRows.isEmpty()) {
      EventRepository.EventWithDistance last = pageRows.get(pageRows.size() - 1);
      nextCursor =
          PageCursor.encode(
              scopeHash, last.distanceMeters(), last.event().startsAt(), last.event().id());
    }
    Integer suggested = null;
    if (items.isEmpty() && cmd.cursor() == null && cmd.radiusMeters() < MAX_RADIUS_METERS) {
      suggested = Math.min(cmd.radiusMeters() * 2, MAX_RADIUS_METERS);
    }
    return new SearchResult(viewer.id(), items, nextCursor, suggested);
  }

  public MinePage findMine(Jwt jwt, String statusFilter, String cursorToken, int limitRaw) {
    AppUser viewer = currentUsers.requireActive(jwt);
    int limit = Math.clamp(limitRaw, 1, 50);
    String status = null;
    if (statusFilter != null && !statusFilter.isBlank()) {
      if (!OWN_EVENT_STATUSES.contains(statusFilter)) {
        throw new BusinessException(
            HttpStatus.BAD_REQUEST, "validation_error", "Unknown status filter: " + statusFilter);
      }
      status = statusFilter;
    }
    int scopeHash = Objects.hash(viewer.id(), status);
    PageCursor cursor = cursorToken == null ? null : PageCursor.decode(cursorToken, scopeHash);
    List<Event> rows = events.findByCreator(viewer.id(), status, cursor, limit + 1);
    boolean hasMore = rows.size() > limit;
    List<Event> pageRows = hasMore ? rows.subList(0, limit) : rows;
    String nextCursor = null;
    if (hasMore && !pageRows.isEmpty()) {
      Event last = pageRows.get(pageRows.size() - 1);
      nextCursor = PageCursor.encode(scopeHash, null, last.startsAt(), last.id());
    }
    return new MinePage(viewer.id(), pageRows, nextCursor);
  }

  public String etag(Event event) {
    return "\"event-" + event.version() + "\"";
  }

  private void requireIfMatch(Event event, String ifMatch) {
    if (ifMatch == null || ifMatch.isBlank()) {
      throw new BusinessException(
          HttpStatus.PRECONDITION_REQUIRED,
          "if_match_required",
          "If-Match is required when updating an event.");
    }
    if (!etag(event).equals(ifMatch)) {
      throw new BusinessException(
          HttpStatus.PRECONDITION_FAILED,
          "concurrent_update",
          "The event has changed since it was retrieved.");
    }
  }

  private static int roundToHundred(double meters) {
    return (int) (Math.round(meters / 100.0) * 100);
  }

  private BusinessException invalidField(String field, String message) {
    return new BusinessException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "validation_error",
        "The request contains invalid fields.",
        Map.of(field, message));
  }

  public record CreateCommand(
      String title,
      String description,
      String notes,
      EventCategory category,
      Instant startsAt,
      int durationMinutes,
      double longitude,
      double latitude,
      AccessMode accessMode,
      Integer capacity) {}

  public record PatchCommand(
      String title,
      String description,
      EventCategory category,
      Instant startsAt,
      Integer durationMinutes,
      Double longitude,
      Double latitude,
      AccessMode accessMode,
      boolean capacityProvided,
      Integer capacity,
      boolean notesProvided,
      String notes) {

    boolean isEmpty() {
      return title == null
          && description == null
          && category == null
          && startsAt == null
          && durationMinutes == null
          && longitude == null
          && latitude == null
          && accessMode == null
          && !capacityProvided
          && !notesProvided;
    }
  }

  public record SearchCommand(
      double longitude,
      double latitude,
      int radiusMeters,
      List<String> categories,
      String cursor,
      int limit) {}

  public record EventView(Event event, UUID viewerId) {}

  public record DiscoveryRow(Event event, int distanceMeters) {}

  public record SearchResult(
      UUID viewerId, List<DiscoveryRow> items, String nextCursor, Integer suggestedRadiusMeters) {}

  public record MinePage(UUID viewerId, List<Event> items, String nextCursor) {}
}
