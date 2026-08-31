package com.joinly.backend.shared;

import java.util.UUID;

/** The only user fields any other user may see: internal id and public alias. */
public record PublicProfile(UUID id, String alias) {}
