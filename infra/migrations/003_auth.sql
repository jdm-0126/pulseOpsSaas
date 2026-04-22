-- auth_users replaces the users table for authentication
CREATE TABLE IF NOT EXISTS auth_users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- drop and recreate sessions with UUID pk + user ref to auth_users
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       BIGINT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id       ON sessions(user_id);

-- link auth_users to account_members
ALTER TABLE account_members
  DROP CONSTRAINT IF EXISTS account_members_user_id_fkey,
  ADD CONSTRAINT account_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
