-- ============================================================
-- 002_schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- ACCOUNTS (tenants)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- ACCOUNT MEMBERS (many-to-many, role per membership)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_members (
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',          -- owner | admin | member
  joined_at  TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (account_id, user_id)
);

-- ------------------------------------------------------------
-- INVITES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invites (
  id         BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'member',
  token      TEXT UNIQUE NOT NULL,
  invited_by BIGINT REFERENCES users(id),
  accepted_at TIMESTAMP,
  expires_at  TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_token      ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_account_id ON invites(account_id);

-- ------------------------------------------------------------
-- SESSIONS (refresh tokens)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at    TIMESTAMP NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id       ON sessions(user_id);

-- ------------------------------------------------------------
-- BILLING CUSTOMERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_customers (
  id                 BIGSERIAL PRIMARY KEY,
  account_id         BIGINT UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at         TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- BILLING SUBSCRIPTIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id                     BIGSERIAL PRIMARY KEY,
  account_id             BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_price_id        TEXT,
  status                 TEXT NOT NULL DEFAULT 'active', -- active | canceled | past_due
  tier                   TEXT NOT NULL DEFAULT 'free',   -- free | pro | enterprise
  current_period_start   TIMESTAMP,
  current_period_end     TIMESTAMP,
  canceled_at            TIMESTAMP,
  created_at             TIMESTAMP DEFAULT NOW(),
  updated_at             TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_subs_account_id ON billing_subscriptions(account_id);

-- ------------------------------------------------------------
-- EVENTS (extend existing with account_id)
-- ------------------------------------------------------------
ALTER TABLE events ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_account_id ON events(account_id);

-- ------------------------------------------------------------
-- ANALYTICS — daily rollups
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_daily (
  id           BIGSERIAL PRIMARY KEY,
  account_id   BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  event_type   TEXT NOT NULL,
  count        INT NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (account_id, date, event_type)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_account_date ON analytics_daily(account_id, date DESC);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily   ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites            ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_events
  ON events USING (account_id = current_setting('app.current_account_id')::BIGINT);

CREATE POLICY tenant_isolation_analytics
  ON analytics_daily USING (account_id = current_setting('app.current_account_id')::BIGINT);

CREATE POLICY tenant_isolation_billing_subs
  ON billing_subscriptions USING (account_id = current_setting('app.current_account_id')::BIGINT);

CREATE POLICY tenant_isolation_billing_customers
  ON billing_customers USING (account_id = current_setting('app.current_account_id')::BIGINT);

CREATE POLICY tenant_isolation_members
  ON account_members USING (account_id = current_setting('app.current_account_id')::BIGINT);

CREATE POLICY tenant_isolation_invites
  ON invites USING (account_id = current_setting('app.current_account_id')::BIGINT);
