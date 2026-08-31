CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_subject uuid NOT NULL UNIQUE,
    alias varchar(40) NOT NULL,
    alias_normalized varchar(40) NOT NULL UNIQUE,
    photo_url text,
    status user_status NOT NULL DEFAULT 'active',
    email_verified boolean NOT NULL DEFAULT false,
    adult_confirmed_at timestamptz NOT NULL,
    terms_version varchar(32) NOT NULL,
    privacy_version varchar(32) NOT NULL,
    guidelines_version varchar(32) NOT NULL,
    terms_accepted_at timestamptz NOT NULL,
    privacy_accepted_at timestamptz NOT NULL,
    guidelines_accepted_at timestamptz NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_alias_length CHECK (char_length(trim(alias)) BETWEEN 3 AND 40)
);

CREATE TABLE events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES users(id),
    title varchar(120) NOT NULL,
    description text NOT NULL,
    notes text,
    category event_category NOT NULL,
    starts_at timestamptz NOT NULL,
    duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 15 AND 1440),
    location geography(Point, 4326) NOT NULL,
    approximate_area varchar(160) NOT NULL,
    capacity integer CHECK (capacity IS NULL OR capacity > 0),
    access_mode event_access_mode NOT NULL,
    status event_status NOT NULL DEFAULT 'published',
    is_hidden boolean NOT NULL DEFAULT false,
    version bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    cancelled_at timestamptz,
    CONSTRAINT events_title_not_blank CHECK (char_length(trim(title)) BETWEEN 3 AND 120),
    CONSTRAINT events_description_not_blank CHECK (char_length(trim(description)) > 0)
);

CREATE INDEX events_location_gist_idx ON events USING gist(location);
CREATE INDEX events_discovery_idx ON events(starts_at)
    WHERE status = 'published' AND is_hidden = false;
CREATE INDEX events_creator_status_starts_idx ON events(creator_id, status, starts_at);
