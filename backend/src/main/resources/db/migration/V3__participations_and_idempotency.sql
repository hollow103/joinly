CREATE TABLE participations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events(id),
    user_id uuid NOT NULL REFERENCES users(id),
    status participation_status NOT NULL,
    requested_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    abandoned_at timestamptz,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id),
    CONSTRAINT participations_dates_match_status CHECK (
        (status = 'confirmed' AND resolved_at IS NOT NULL AND abandoned_at IS NULL)
        OR (status = 'abandoned' AND resolved_at IS NOT NULL AND abandoned_at IS NOT NULL)
        OR (status = 'pending' AND resolved_at IS NULL AND abandoned_at IS NULL)
        OR (status = 'rejected' AND resolved_at IS NOT NULL AND abandoned_at IS NULL)
    )
);

CREATE INDEX participations_event_status_idx ON participations(event_id, status);
CREATE INDEX participations_user_status_idx ON participations(user_id, status);

CREATE TABLE idempotency_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    operation varchar(100) NOT NULL,
    idempotency_key varchar(100) NOT NULL,
    request_hash varchar(64) NOT NULL,
    resource_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    UNIQUE(user_id, operation, idempotency_key)
);

CREATE INDEX idempotency_expiry_idx ON idempotency_records(expires_at);
