CREATE TABLE IF NOT EXISTS events (
  id              SERIAL PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  type            TEXT NOT NULL,
  payload         JSONB,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type       ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
