package com.joinly.backend.participation;

import com.joinly.backend.events.EventParticipation;
import com.joinly.backend.shared.PublicProfile;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Implements the {@code events} module's read port; keeps the dependency arrow participation →
 * events.
 */
@Component
public class ParticipationDirectory implements EventParticipation {

  private final ParticipationRepository participations;

  public ParticipationDirectory(ParticipationRepository participations) {
    this.participations = participations;
  }

  @Override
  public int confirmedCount(UUID eventId) {
    return participations.countConfirmed(eventId);
  }

  @Override
  public Map<UUID, Integer> confirmedCounts(Collection<UUID> eventIds) {
    return participations.countConfirmedByEvents(eventIds);
  }

  @Override
  public boolean isConfirmedParticipant(UUID userId, UUID eventId) {
    return participations.isConfirmed(userId, eventId);
  }

  @Override
  public String myParticipationStatus(UUID userId, UUID eventId) {
    return participations.statusOf(userId, eventId).orElse(null);
  }

  @Override
  public List<PublicProfile> confirmedParticipants(UUID eventId) {
    return participations.confirmedProfiles(eventId);
  }

  @Override
  public List<UUID> confirmedParticipantIds(UUID eventId) {
    return participations.confirmedUserIds(eventId);
  }
}
