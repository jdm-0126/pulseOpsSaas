-- usage_events for metered billing / analytics
CREATE TABLE IF NOT EXISTS usage_events (
  id         BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  metric     TEXT NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_account_id ON usage_events(account_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_metric     ON usage_events(account_id, metric, created_at DESC);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_usage_events
  ON usage_events USING (account_id = current_setting('app.current_account_id')::BIGINT);
