CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_status AS ENUM ('active', 'suspended');
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE event_category AS ENUM (
    'sport_wellbeing',
    'culture_leisure',
    'learning',
    'community_volunteering',
    'pets',
    'networking'
);
CREATE TYPE event_access_mode AS ENUM ('direct', 'approval', 'private_invitation');
CREATE TYPE event_status AS ENUM ('published', 'cancelled', 'closed');
CREATE TYPE participation_status AS ENUM ('pending', 'confirmed', 'rejected', 'abandoned');
