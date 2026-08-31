package com.joinly.backend.blocks;

import com.joinly.backend.shared.BusinessException;
import com.joinly.backend.shared.KeysetCursor;
import com.joinly.backend.shared.PublicProfile;
import com.joinly.backend.users.AppUser;
import com.joinly.backend.users.CurrentUserService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

/**
 * Reciprocal user blocks. Only the person who created a block can remove it, but its effect (hiding
 * events and preventing participation both ways) is evaluated through {@link #blocked(UUID, UUID)},
 * which other modules call.
 */
@Service
public class BlockService {

  private final BlockRepository blocks;
  private final CurrentUserService currentUsers;
  private final Clock clock;

  public BlockService(BlockRepository blocks, CurrentUserService currentUsers, Clock clock) {
    this.blocks = blocks;
    this.currentUsers = currentUsers;
    this.clock = clock;
  }

  /** True when a block exists in either direction between two distinct users. */
  public boolean blocked(UUID a, UUID b) {
    return !a.equals(b) && blocks.existsBetween(a, b);
  }

  public void create(Jwt jwt, UUID blockedUserId) {
    AppUser user = currentUsers.requireActive(jwt);
    if (user.id().equals(blockedUserId)) {
      throw new BusinessException(
          HttpStatus.UNPROCESSABLE_ENTITY, "cannot_block_self", "You cannot block yourself.");
    }
    try {
      blocks.insertIfAbsent(user.id(), blockedUserId, Instant.now(clock));
    } catch (DataIntegrityViolationException exception) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "not_found", "The user does not exist.");
    }
  }

  public void delete(Jwt jwt, UUID blockedUserId) {
    AppUser user = currentUsers.requireActive(jwt);
    blocks.delete(user.id(), blockedUserId); // idempotent
  }

  public BlockPage list(Jwt jwt, String cursorToken, int limitRaw) {
    AppUser user = currentUsers.requireActive(jwt);
    int limit = Math.clamp(limitRaw, 1, 50);
    int scopeHash = Objects.hash(user.id());
    KeysetCursor cursor =
        cursorToken == null || cursorToken.isBlank()
            ? null
            : KeysetCursor.decode(cursorToken, scopeHash);
    List<BlockRepository.BlockRow> rows =
        blocks.findByBlocker(
            user.id(),
            cursor == null ? null : cursor.timestamp(),
            cursor == null ? null : cursor.id(),
            limit + 1);
    boolean hasMore = rows.size() > limit;
    List<BlockRepository.BlockRow> pageRows = hasMore ? rows.subList(0, limit) : rows;
    List<BlockedUser> items =
        pageRows.stream()
            .map(
                row ->
                    new BlockedUser(
                        new PublicProfile(row.blockedId(), row.blockedAlias()), row.createdAt()))
            .toList();
    String nextCursor = null;
    if (hasMore && !pageRows.isEmpty()) {
      BlockRepository.BlockRow last = pageRows.get(pageRows.size() - 1);
      nextCursor = KeysetCursor.encode(scopeHash, null, last.createdAt(), last.id());
    }
    return new BlockPage(items, nextCursor);
  }

  public record BlockedUser(PublicProfile user, Instant createdAt) {}

  public record BlockPage(List<BlockedUser> items, String nextCursor) {}
}
