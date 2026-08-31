ALTER TABLE users
    ADD COLUMN version bigint NOT NULL DEFAULT 0,
    ADD COLUMN preferred_search_point geography(Point, 4326),
    ADD COLUMN preferred_search_label varchar(160);

CREATE TABLE account_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES users(id),
    subject_id uuid NOT NULL REFERENCES users(id),
    action varchar(64) NOT NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT account_audit_action CHECK (action IN ('admin_granted', 'admin_revoked', 'session_revocation_requested'))
);

CREATE INDEX account_audit_subject_created_idx ON account_audit(subject_id, created_at DESC);
