package com.joinly.backend.blocks;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/blocks")
public class BlockController {

  private final BlockService blocks;

  public BlockController(BlockService blocks) {
    this.blocks = blocks;
  }

  @PostMapping
  ResponseEntity<Void> create(
      @AuthenticationPrincipal Jwt jwt, @RequestBody CreateBlockRequest request) {
    blocks.create(jwt, request.blockedUserId());
    return ResponseEntity.status(HttpStatus.CREATED).build();
  }

  @DeleteMapping("/{blockedUserId}")
  ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID blockedUserId) {
    blocks.delete(jwt, blockedUserId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping
  ResponseEntity<BlockPageResponse> list(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(name = "cursor", required = false) String cursor,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {
    BlockService.BlockPage page = blocks.list(jwt, cursor, limit);
    return ResponseEntity.ok(new BlockPageResponse(page.items(), new PageInfo(page.nextCursor())));
  }

  public record CreateBlockRequest(@NotNull UUID blockedUserId) {}

  public record PageInfo(String nextCursor) {}

  public record BlockPageResponse(List<BlockService.BlockedUser> items, PageInfo page) {}
}
