ALTER TABLE push_devices
    ALTER COLUMN expo_push_token DROP NOT NULL;

CREATE UNIQUE INDEX push_devices_user_unique_idx ON push_devices(user_id);

ALTER TABLE account_audit
    DROP CONSTRAINT account_audit_action,
    ADD CONSTRAINT account_audit_action CHECK (
        action IN ('admin_granted', 'admin_revoked', 'session_revocation_requested', 'account_anonymized')
    );
