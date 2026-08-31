package com.joinly.backend.events;

import com.joinly.backend.shared.PublicProfile;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Port the {@code events} module uses to read participation state it does not own. Implemented by
 * the {@code participation} module (dependency arrow: participation → events), so {@code events}
 * never imports {@code participation} and there is no cycle.
 */
public interface EventParticipation {

  int confirmedCount(UUID eventId);

  Map<UUID, Integer> confirmedCounts(Collection<UUID> eventIds);

  boolean isConfirmedParticipant(UUID userId, UUID eventId);

  /** The viewer's own participation status for the event, or {@code null} if none exists. */
  String myParticipationStatus(UUID userId, UUID eventId);

  /** Confirmed participants of the event, for the creator's detail view. */
  List<PublicProfile> confirmedParticipants(UUID eventId);
}
