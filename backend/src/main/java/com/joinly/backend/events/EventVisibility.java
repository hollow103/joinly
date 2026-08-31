package com.joinly.backend.events;

import com.joinly.backend.shared.BusinessException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Central authority for who may see an event and which fields they receive. Every read path
 * (discovery, detail, own events) routes through it so the exact location is never projected before
 * a confirmed participation. Phase 3 extends the "confirmed participant" and reciprocal-block rules
 * here without touching the controller or the queries.
 */
@Component
public class EventVisibility {

  /** Throws a uniform {@code 404} when the viewer must not learn the event exists. */
  public void assertVisible(Event event, UUID viewerId) {
    if (isCreator(event, viewerId)) {
      return;
    }
    boolean publiclyVisible =
        event.isPublished()
            && !event.hidden()
            && event.accessMode() != AccessMode.PRIVATE_INVITATION;
    if (!publiclyVisible) {
      throw notFound();
    }
  }

  public boolean isCreator(Event event, UUID viewerId) {
    return event.creatorId().equals(viewerId);
  }

  /** Phase 3 also grants this to a confirmed participant of the event. */
  public boolean canSeeExactLocation(Event event, UUID viewerId) {
    return isCreator(event, viewerId);
  }

  /** Phase 3 also grants this to a confirmed participant (of a public event) as an empty list. */
  public boolean canSeeConfirmedParticipants(Event event, UUID viewerId) {
    return isCreator(event, viewerId);
  }

  public BusinessException notFound() {
    return new BusinessException(
        HttpStatus.NOT_FOUND, "not_found", "The event does not exist or is not visible.");
  }
}
