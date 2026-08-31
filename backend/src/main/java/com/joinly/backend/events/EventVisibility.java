package com.joinly.backend.events;

import com.joinly.backend.blocks.BlockService;
import com.joinly.backend.shared.BusinessException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Central authority for who may see an event and which fields they receive. Every read path
 * (discovery, detail, own events) routes through it so the exact location is never projected before
 * a confirmed participation, and a reciprocal block hides the event entirely.
 */
@Component
public class EventVisibility {

  private final EventParticipation participation;
  private final BlockService blocks;

  public EventVisibility(EventParticipation participation, BlockService blocks) {
    this.participation = participation;
    this.blocks = blocks;
  }

  /** Throws a uniform {@code 404} when the viewer must not learn the event exists. */
  public void assertVisible(Event event, UUID viewerId) {
    if (isCreator(event, viewerId)) {
      return;
    }
    if (blocks.blocked(viewerId, event.creatorId())) {
      throw notFound();
    }
    if (!event.isPublished() || event.hidden()) {
      throw notFound();
    }
    if (event.accessMode() == AccessMode.PRIVATE_INVITATION
        && !participation.isConfirmedParticipant(viewerId, event.id())) {
      throw notFound();
    }
  }

  public boolean isCreator(Event event, UUID viewerId) {
    return event.creatorId().equals(viewerId);
  }

  public boolean canSeeExactLocation(Event event, UUID viewerId) {
    return isCreator(event, viewerId) || participation.isConfirmedParticipant(viewerId, event.id());
  }

  public boolean canSeeConfirmedParticipants(Event event, UUID viewerId) {
    return isCreator(event, viewerId);
  }

  public BusinessException notFound() {
    return new BusinessException(
        HttpStatus.NOT_FOUND, "not_found", "The event does not exist or is not visible.");
  }
}
