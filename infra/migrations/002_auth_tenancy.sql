-- ============================================================
-- 002_auth_tenancy.sql
-- ============================================================

-- ------------------------------------------------------------
-- Accounts (tenants)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              BIGSERIAL PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT,                        -- null for OAuth users
  full_name       TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Account members (many-to-many, user ↔ account)
-- ------------------------------------------------------------
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE IF NOT EXISTS account_members (
  user_id     BIGINT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  account_id  BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role        member_role NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_account_members_account ON account_members(account_id);
CREATE INDEX IF NOT EXISTS idx_account_members_user    ON account_members(user_id);

-- ------------------------------------------------------------
-- Invites
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invites (
  id          BIGSERIAL PRIMARY KEY,
  account_id  BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        member_role NOT NULL DEFAULT 'member',
  token       TEXT UNIQUE NOT NULL,
  invited_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMP,
  expires_at  TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_token      ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_account    ON invites(account_id);
CREATE INDEX IF NOT EXISTS idx_invites_email      ON invites(email);

-- ------------------------------------------------------------
-- Sessions (refresh tokens)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at    TIMESTAMP NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user          ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);

-- ------------------------------------------------------------
-- Patch events table — add account_id
-- ------------------------------------------------------------
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_account ON events(account_id);

-- ------------------------------------------------------------
-- Supabase RLS
-- ------------------------------------------------------------
ALTER TABLE accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events          ENABLE ROW LEVEL SECURITY;

-- Helper: current user id from JWT claim
CREATE OR REPLACE FUNCTION current_user_id() RETURNS BIGINT AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::BIGINT;
$$ LANGUAGE sql STABLE;

-- Helper: account ids the current user belongs to
CREATE OR REPLACE FUNCTION current_account_ids() RETURNS SETOF BIGINT AS $$
  SELECT account_id FROM account_members WHERE user_id = current_user_id();
$$ LANGUAGE sql STABLE;

-- accounts: visible if member
CREATE POLICY accounts_select ON accounts FOR SELECT
  USING (id IN (SELECT current_account_ids()));

CREATE POLICY accounts_insert ON accounts FOR INSERT
  WITH CHECK (true);  -- anyone can create an account (they become owner)

-- account_members: visible within same account
CREATE POLICY members_select ON account_members FOR SELECT
  USING (account_id IN (SELECT current_account_ids()));

CREATE POLICY members_insert ON account_members FOR INSERT
  WITH CHECK (account_id IN (SELECT current_account_ids()));

CREATE POLICY members_delete ON account_members FOR DELETE
  USING (account_id IN (SELECT current_account_ids()));

-- invites: scoped to account
CREATE POLICY invites_select ON invites FOR SELECT
  USING (account_id IN (SELECT current_account_ids()));

CREATE POLICY invites_insert ON invites FOR INSERT
  WITH CHECK (account_id IN (SELECT current_account_ids()));

-- sessions: own sessions only
CREATE POLICY sessions_select ON sessions FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY sessions_delete ON sessions FOR DELETE
  USING (user_id = current_user_id());

-- events: scoped to account
CREATE POLICY events_select ON events FOR SELECT
  USING (account_id IN (SELECT current_account_ids()));

CREATE POLICY events_insert ON events FOR INSERT
  WITH CHECK (account_id IN (SELECT current_account_ids()));
