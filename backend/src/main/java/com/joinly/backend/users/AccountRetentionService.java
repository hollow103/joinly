package com.joinly.backend.users;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountRetentionService {

  private static final Duration DELETION_GRACE_PERIOD = Duration.ofDays(30);

  private final UserRepository users;
  private final Clock clock;

  public AccountRetentionService(UserRepository users, Clock clock) {
    this.users = users;
    this.clock = clock;
  }

  @Scheduled(cron = "${joinly.retention.account-deletion-cron:0 0 3 * * *}")
  @Transactional
  public void anonymizeDueAccounts() {
    Instant now = Instant.now(clock);
    users.anonymizeDeletionRequestsBefore(now.minus(DELETION_GRACE_PERIOD), now);
  }
}
