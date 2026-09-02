package com.joinly.backend.events;

import java.time.Clock;
import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventClosingService {

  private final EventRepository events;
  private final Clock clock;

  public EventClosingService(EventRepository events, Clock clock) {
    this.events = events;
    this.clock = clock;
  }

  @Scheduled(cron = "${joinly.events.closing-cron:0 * * * * *}")
  @Transactional
  public void closeEndedEvents() {
    events.closeEndedEvents(Instant.now(clock));
  }
}
