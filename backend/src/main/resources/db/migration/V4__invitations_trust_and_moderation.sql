CREATE TYPE report_reason AS ENUM (
    'inappropriate_content',
    'abusive_behavior',
    'fraudulent_event',
    'misleading_location',
    'other'
);
CREATE TYPE report_status AS ENUM ('pending', 'archived', 'resolved');
CREATE TYPE moderation_action AS ENUM ('none', 'hide_event', 'warn_user', 'suspend_user');

CREATE TABLE invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events(id),
    created_by uuid NOT NULL REFERENCES users(id),
    code_hash varchar(128) NOT NULL UNIQUE,
    max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
    used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    expires_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT invitations_uses_within_limit CHECK (max_uses IS NULL OR used_count <= max_uses)
);

CREATE INDEX invitations_code_hash_idx ON invitations(code_hash);

CREATE TABLE blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id uuid NOT NULL REFERENCES users(id),
    blocked_id uuid NOT NULL REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(blocker_id, blocked_id),
    CONSTRAINT blocks_distinct_users CHECK (blocker_id <> blocked_id)
);

CREATE INDEX blocks_reverse_idx ON blocks(blocked_id, blocker_id);

CREATE TABLE reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES users(id),
    reported_user_id uuid REFERENCES users(id),
    reported_event_id uuid REFERENCES events(id),
    reason report_reason NOT NULL,
    description text,
    status report_status NOT NULL DEFAULT 'pending',
    decision_action moderation_action,
    decision_note text,
    decided_by uuid REFERENCES users(id),
    decided_at timestamptz,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reports_one_target CHECK ((reported_user_id IS NOT NULL) <> (reported_event_id IS NOT NULL)),
    CONSTRAINT reports_decision_state CHECK (
        (status = 'pending' AND decision_action IS NULL AND decision_note IS NULL
            AND decided_by IS NULL AND decided_at IS NULL)
        OR (status IN ('archived', 'resolved') AND decision_action IS NOT NULL
            AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
    )
);

CREATE INDEX reports_status_created_idx ON reports(status, created_at);

CREATE TABLE moderation_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid REFERENCES reports(id),
    actor_id uuid REFERENCES users(id),
    action varchar(64) NOT NULL,
    fields_accessed jsonb NOT NULL DEFAULT '[]'::jsonb,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);
