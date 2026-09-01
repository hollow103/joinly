ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'deletion_requested';

ALTER TABLE users
    ADD COLUMN deletion_requested_at timestamptz;

CREATE INDEX users_deletion_requested_idx
    ON users(deletion_requested_at)
    WHERE deletion_requested_at IS NOT NULL;
