CREATE TABLE push_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    expo_push_token text NOT NULL UNIQUE,
    enabled boolean NOT NULL DEFAULT true,
    preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_devices_user_idx ON push_devices(user_id);

CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id uuid NOT NULL REFERENCES users(id),
    event_id uuid REFERENCES events(id),
    participation_id uuid REFERENCES participations(id),
    type varchar(64) NOT NULL,
    delivery_status varchar(32) NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz,
    CONSTRAINT notifications_delivery_status CHECK (delivery_status IN ('pending', 'sent', 'failed'))
);

CREATE INDEX notifications_recipient_created_idx ON notifications(recipient_id, created_at DESC);
