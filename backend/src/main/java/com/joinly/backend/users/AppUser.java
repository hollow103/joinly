package com.joinly.backend.users;

import java.time.Instant;
import java.util.UUID;

public record AppUser(
    UUID id,
    UUID authSubject,
    String alias,
    String photoUrl,
    String status,
    boolean emailVerified,
    String termsVersion,
    String privacyVersion,
    String guidelinesVersion,
    Instant termsAcceptedAt,
    Instant privacyAcceptedAt,
    Instant guidelinesAcceptedAt,
    ManualSearchArea manualSearchArea,
    String role,
    long version,
    Instant createdAt,
    Instant updatedAt) {}
