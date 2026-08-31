package com.joinly.backend.events;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.joinly.backend.shared.PublicProfile;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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
public class EventController {

  private static final String CATEGORY_PATTERN =
      "sportWellbeing|cultureLeisure|learning|communityVolunteering|pets|networking";
  private static final String ACCESS_MODE_PATTERN = "direct|approval|privateInvitation";

  private final EventService events;
  private final EventVisibility visibility;
  private final EventParticipation participation;

  public EventController(
      EventService events, EventVisibility visibility, EventParticipation participation) {
    this.events = events;
    this.visibility = visibility;
    this.participation = participation;
  }

  @PostMapping("/events")
  ResponseEntity<EventDetailResponse> create(
      @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateEventRequest request) {
    EventService.EventView view = events.create(jwt, request.toCommand());
    return ResponseEntity.status(HttpStatus.CREATED)
        .eTag(events.etag(view.event()))
        .body(detail(view));
  }

  @PostMapping("/events/search")
  ResponseEntity<SearchPageResponse> search(
      @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SearchRequest request) {
    EventService.SearchResult result = events.search(jwt, request.toCommand());
    List<EventDiscoveryResponse> items = result.items().stream().map(this::discovery).toList();
    return ResponseEntity.ok(
        new SearchPageResponse(
            items, new PageInfo(result.nextCursor()), result.suggestedRadiusMeters()));
  }

  @GetMapping("/events/{eventId}")
  ResponseEntity<EventDetailResponse> get(
      @AuthenticationPrincipal Jwt jwt, @PathVariable UUID eventId) {
    EventService.EventView view = events.get(jwt, eventId);
    return ResponseEntity.ok().eTag(events.etag(view.event())).body(detail(view));
  }

  @PatchMapping("/events/{eventId}")
  ResponseEntity<EventDetailResponse> patch(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID eventId,
      @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch,
      @Valid @RequestBody PatchEventRequest request) {
    EventService.EventView view = events.update(jwt, eventId, request.toCommand(), ifMatch);
    return ResponseEntity.ok().eTag(events.etag(view.event())).body(detail(view));
  }

  @PostMapping("/events/{eventId}/cancellation")
  ResponseEntity<Void> cancel(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable UUID eventId,
      @Valid @RequestBody(required = false) CancelRequest request) {
    // The optional reason is not persisted in Phase 2; participant notifications arrive in Phase
    // 3/4.
    events.cancel(jwt, eventId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/me/events")
  ResponseEntity<EventPageResponse> mine(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(name = "status", required = false) String status,
      @RequestParam(name = "cursor", required = false) String cursor,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {
    EventService.MinePage page = events.findMine(jwt, status, cursor, limit);
    Map<UUID, Integer> counts =
        participation.confirmedCounts(page.items().stream().map(Event::id).toList());
    List<EventDetailResponse> items =
        page.items().stream()
            .map(event -> ownEventItem(event, counts.getOrDefault(event.id(), 0)))
            .toList();
    return ResponseEntity.ok(new EventPageResponse(items, new PageInfo(page.nextCursor())));
  }

  private EventDetailResponse detail(EventService.EventView view) {
    Event event = view.event();
    UUID viewerId = view.viewerId();
    boolean creator = visibility.isCreator(event, viewerId);
    int confirmedCount = participation.confirmedCount(event.id());
    GeoPointResponse exactLocation =
        visibility.canSeeExactLocation(event, viewerId)
            ? new GeoPointResponse("Point", List.of(event.longitude(), event.latitude()))
            : null;
    List<PublicProfile> confirmedParticipants =
        visibility.canSeeConfirmedParticipants(event, viewerId)
            ? participation.confirmedParticipants(event.id())
            : null;
    String myParticipation =
        creator ? null : participation.myParticipationStatus(viewerId, event.id());
    return new EventDetailResponse(
        event.id(),
        event.title(),
        event.description(),
        event.category().apiValue(),
        event.startsAt(),
        event.durationMinutes(),
        event.accessMode().apiValue(),
        event.capacity(),
        confirmedCount,
        availability(event.capacity(), confirmedCount),
        event.approximateArea(),
        null,
        new PublicProfile(event.creatorId(), event.creatorAlias()),
        event.notes(),
        event.updatedAt(),
        myParticipation,
        exactLocation,
        confirmedParticipants);
  }

  /** Lighter projection for the creator's own-events list: no participant enumeration. */
  private EventDetailResponse ownEventItem(Event event, int confirmedCount) {
    return new EventDetailResponse(
        event.id(),
        event.title(),
        event.description(),
        event.category().apiValue(),
        event.startsAt(),
        event.durationMinutes(),
        event.accessMode().apiValue(),
        event.capacity(),
        confirmedCount,
        availability(event.capacity(), confirmedCount),
        event.approximateArea(),
        null,
        new PublicProfile(event.creatorId(), event.creatorAlias()),
        event.notes(),
        event.updatedAt(),
        null,
        new GeoPointResponse("Point", List.of(event.longitude(), event.latitude())),
        null);
  }

  private EventDiscoveryResponse discovery(EventService.DiscoveryRow row) {
    Event event = row.event();
    return new EventDiscoveryResponse(
        event.id(),
        event.title(),
        event.description(),
        event.category().apiValue(),
        event.startsAt(),
        event.durationMinutes(),
        event.accessMode().apiValue(),
        event.capacity(),
        row.confirmedCount(),
        availability(event.capacity(), row.confirmedCount()),
        event.approximateArea(),
        row.distanceMeters(),
        new PublicProfile(event.creatorId(), event.creatorAlias()));
  }

  private static String availability(Integer capacity, int confirmedCount) {
    return capacity != null && confirmedCount >= capacity ? "full" : "available";
  }

  public record CreateEventRequest(
      @NotBlank @Size(min = 3, max = 120) String title,
      @NotBlank @Size(max = 4000) String description,
      @Size(max = 4000) String notes,
      @NotBlank @Pattern(regexp = CATEGORY_PATTERN) String category,
      @NotNull Instant startsAt,
      @NotNull @Min(15) @Max(1440) Integer durationMinutes,
      @NotNull @Valid GeoPointPayload exactLocation,
      @NotBlank @Pattern(regexp = ACCESS_MODE_PATTERN) String accessMode,
      @Min(1) Integer capacity) {

    EventService.CreateCommand toCommand() {
      return new EventService.CreateCommand(
          title.trim(),
          description.trim(),
          notes == null || notes.isBlank() ? null : notes.trim(),
          EventCategory.fromApi(category),
          startsAt,
          durationMinutes,
          exactLocation.longitude(),
          exactLocation.latitude(),
          AccessMode.fromApi(accessMode),
          capacity);
    }
  }

  public static final class PatchEventRequest {

    @Size(min = 3, max = 120)
    private String title;

    @Size(max = 4000)
    private String description;

    @Pattern(regexp = CATEGORY_PATTERN)
    private String category;

    private Instant startsAt;

    @Min(15)
    @Max(1440)
    private Integer durationMinutes;

    @Valid private GeoPointPayload exactLocation;

    @Pattern(regexp = ACCESS_MODE_PATTERN)
    private String accessMode;

    @Min(1)
    private Integer capacity;

    private boolean capacityProvided;

    @Size(max = 4000)
    private String notes;

    private boolean notesProvided;

    @JsonSetter("title")
    public void setTitle(String title) {
      this.title = title;
    }

    @JsonSetter("description")
    public void setDescription(String description) {
      this.description = description;
    }

    @JsonSetter("category")
    public void setCategory(String category) {
      this.category = category;
    }

    @JsonSetter("startsAt")
    public void setStartsAt(Instant startsAt) {
      this.startsAt = startsAt;
    }

    @JsonSetter("durationMinutes")
    public void setDurationMinutes(Integer durationMinutes) {
      this.durationMinutes = durationMinutes;
    }

    @JsonSetter("exactLocation")
    public void setExactLocation(GeoPointPayload exactLocation) {
      this.exactLocation = exactLocation;
    }

    @JsonSetter("accessMode")
    public void setAccessMode(String accessMode) {
      this.accessMode = accessMode;
    }

    @JsonSetter("capacity")
    public void setCapacity(Integer capacity) {
      this.capacity = capacity;
      this.capacityProvided = true;
    }

    @JsonSetter("notes")
    public void setNotes(String notes) {
      this.notes = notes;
      this.notesProvided = true;
    }

    EventService.PatchCommand toCommand() {
      return new EventService.PatchCommand(
          title == null ? null : title.trim(),
          description == null ? null : description.trim(),
          category == null ? null : EventCategory.fromApi(category),
          startsAt,
          durationMinutes,
          exactLocation == null ? null : exactLocation.longitude(),
          exactLocation == null ? null : exactLocation.latitude(),
          accessMode == null ? null : AccessMode.fromApi(accessMode),
          capacityProvided,
          capacity,
          notesProvided,
          notes == null || notes.isBlank() ? null : notes.trim());
    }
  }

  public record GeoPointPayload(String type, List<Double> coordinates) {

    @JsonIgnore
    @AssertTrue(message = "must be a GeoJSON Point with [longitude, latitude] within valid ranges")
    public boolean isValidPoint() {
      if (!"Point".equals(type) || coordinates == null || coordinates.size() != 2) {
        return false;
      }
      Double lon = coordinates.get(0);
      Double lat = coordinates.get(1);
      return lon != null && lat != null && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
    }

    double longitude() {
      return coordinates.get(0);
    }

    double latitude() {
      return coordinates.get(1);
    }
  }

  public record SearchRequest(
      @NotNull @Valid GeoPointPayload origin,
      @NotNull @Min(100) @Max(50000) Integer radiusMeters,
      List<@Pattern(regexp = CATEGORY_PATTERN) String> categories,
      String cursor,
      Integer limit) {

    EventService.SearchCommand toCommand() {
      return new EventService.SearchCommand(
          origin.longitude(),
          origin.latitude(),
          radiusMeters,
          categories == null ? List.of() : categories,
          cursor == null || cursor.isBlank() ? null : cursor,
          limit == null ? 20 : limit);
    }
  }

  public record CancelRequest(@Size(max = 4000) String reason) {}

  public record GeoPointResponse(String type, List<Double> coordinates) {}

  public record PageInfo(String nextCursor) {}

  public record EventDiscoveryResponse(
      UUID id,
      String title,
      String description,
      String category,
      Instant startsAt,
      int durationMinutes,
      String accessMode,
      Integer capacity,
      int confirmedCount,
      String availability,
      String approximateArea,
      Integer distanceMeters,
      PublicProfile creator) {}

  public record EventDetailResponse(
      UUID id,
      String title,
      String description,
      String category,
      Instant startsAt,
      int durationMinutes,
      String accessMode,
      Integer capacity,
      int confirmedCount,
      String availability,
      String approximateArea,
      Integer distanceMeters,
      PublicProfile creator,
      String notes,
      Instant updatedAt,
      String myParticipation,
      GeoPointResponse exactLocation,
      List<PublicProfile> confirmedParticipants) {}

  public record SearchPageResponse(
      List<EventDiscoveryResponse> items, PageInfo page, Integer suggestedRadiusMeters) {}

  public record EventPageResponse(List<EventDetailResponse> items, PageInfo page) {}
}
