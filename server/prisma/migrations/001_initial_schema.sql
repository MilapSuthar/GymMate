-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE "Role" AS ENUM ('user', 'trainer', 'dietitian', 'admin');
CREATE TYPE "FitnessLevel" AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE "SwipeDirection" AS ENUM ('like', 'pass');
CREATE TYPE "MessageType" AS ENUM ('text', 'image', 'gif');
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewed', 'actioned');
CREATE TYPE "Platform" AS ENUM ('ios', 'android');

-- Users table (gym_location is managed via raw SQL with PostGIS)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT UNIQUE,
  password_hash TEXT,
  role          "Role" NOT NULL DEFAULT 'user',
  display_name  TEXT NOT NULL,
  bio           TEXT,
  date_of_birth TIMESTAMPTZ,
  avatar_url    TEXT,
  photos        TEXT[] NOT NULL DEFAULT '{}',
  gym_name      TEXT,
  gym_location  GEOGRAPHY(Point, 4326),
  goals         TEXT[] NOT NULL DEFAULT '{}',
  fitness_level "FitnessLevel",
  is_verified   BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX users_gym_location_gist ON users USING GIST (gym_location);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Swipes
CREATE TABLE swipes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  swiped_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction  "SwipeDirection" NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (swiper_id, swiped_id)
);

CREATE INDEX swipes_swiper_swiped ON swipes (swiper_id, swiped_id);

-- Matches
CREATE TABLE matches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a_id, user_b_id)
);

-- Messages
CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id     UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT,
  media_url    TEXT,
  message_type "MessageType" NOT NULL DEFAULT 'text',
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_match_created ON messages (match_id, created_at DESC);

-- Blocks
CREATE TABLE blocks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

-- Reports
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  details     TEXT,
  status      "ReportStatus" NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Device tokens
CREATE TABLE device_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   "Platform" NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);
