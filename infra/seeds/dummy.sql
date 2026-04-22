-- Seed dummy data for account_id = 1

-- ── Events ────────────────────────────────────────────────────────────────────
INSERT INTO events (idempotency_key, type, payload, account_id, created_at) VALUES
  ('evt_001', 'payment_success', '{"amount":4900,"currency":"usd"}',   1, NOW() - INTERVAL '1 day'),
  ('evt_002', 'payment_success', '{"amount":9900,"currency":"usd"}',   1, NOW() - INTERVAL '2 days'),
  ('evt_003', 'user_signup',     '{"email":"alice@example.com"}',      1, NOW() - INTERVAL '2 days'),
  ('evt_004', 'payment_success', '{"amount":2900,"currency":"usd"}',   1, NOW() - INTERVAL '3 days'),
  ('evt_005', 'user_signup',     '{"email":"bob@example.com"}',        1, NOW() - INTERVAL '3 days'),
  ('evt_006', 'payment_success', '{"amount":14900,"currency":"usd"}',  1, NOW() - INTERVAL '4 days'),
  ('evt_007', 'user_signup',     '{"email":"carol@example.com"}',      1, NOW() - INTERVAL '5 days'),
  ('evt_008', 'payment_success', '{"amount":4900,"currency":"usd"}',   1, NOW() - INTERVAL '5 days'),
  ('evt_009', 'payment_success', '{"amount":9900,"currency":"usd"}',   1, NOW() - INTERVAL '6 days'),
  ('evt_010', 'user_signup',     '{"email":"dave@example.com"}',       1, NOW() - INTERVAL '7 days'),
  ('evt_011', 'payment_success', '{"amount":4900,"currency":"usd"}',   1, NOW() - INTERVAL '8 days'),
  ('evt_012', 'payment_success', '{"amount":19900,"currency":"usd"}',  1, NOW() - INTERVAL '9 days'),
  ('evt_013', 'user_signup',     '{"email":"eve@example.com"}',        1, NOW() - INTERVAL '10 days'),
  ('evt_014', 'payment_success', '{"amount":4900,"currency":"usd"}',   1, NOW() - INTERVAL '11 days'),
  ('evt_015', 'user_signup',     '{"email":"frank@example.com"}',      1, NOW() - INTERVAL '12 days')
ON CONFLICT (idempotency_key) DO NOTHING;

-- ── Analytics daily rollups ───────────────────────────────────────────────────
INSERT INTO analytics_daily (account_id, date, event_type, count, revenue_cents) VALUES
  (1, CURRENT_DATE - 1,  'payment_success', 3,  24700),
  (1, CURRENT_DATE - 1,  'user_signup',     2,  0),
  (1, CURRENT_DATE - 2,  'payment_success', 5,  49500),
  (1, CURRENT_DATE - 2,  'user_signup',     4,  0),
  (1, CURRENT_DATE - 3,  'payment_success', 2,  19800),
  (1, CURRENT_DATE - 3,  'user_signup',     1,  0),
  (1, CURRENT_DATE - 4,  'payment_success', 6,  59400),
  (1, CURRENT_DATE - 4,  'user_signup',     3,  0),
  (1, CURRENT_DATE - 5,  'payment_success', 4,  39600),
  (1, CURRENT_DATE - 5,  'user_signup',     2,  0),
  (1, CURRENT_DATE - 6,  'payment_success', 7,  69300),
  (1, CURRENT_DATE - 6,  'user_signup',     5,  0),
  (1, CURRENT_DATE - 7,  'payment_success', 3,  29700),
  (1, CURRENT_DATE - 7,  'user_signup',     2,  0),
  (1, CURRENT_DATE - 8,  'payment_success', 8,  79200),
  (1, CURRENT_DATE - 8,  'user_signup',     6,  0),
  (1, CURRENT_DATE - 9,  'payment_success', 4,  39600),
  (1, CURRENT_DATE - 9,  'user_signup',     3,  0),
  (1, CURRENT_DATE - 10, 'payment_success', 5,  49500),
  (1, CURRENT_DATE - 10, 'user_signup',     4,  0),
  (1, CURRENT_DATE - 11, 'payment_success', 2,  19800),
  (1, CURRENT_DATE - 11, 'user_signup',     1,  0),
  (1, CURRENT_DATE - 12, 'payment_success', 9,  89100),
  (1, CURRENT_DATE - 12, 'user_signup',     7,  0),
  (1, CURRENT_DATE - 13, 'payment_success', 3,  29700),
  (1, CURRENT_DATE - 13, 'user_signup',     2,  0),
  (1, CURRENT_DATE - 14, 'payment_success', 6,  59400),
  (1, CURRENT_DATE - 14, 'user_signup',     4,  0),
  (1, CURRENT_DATE - 15, 'payment_success', 4,  39600),
  (1, CURRENT_DATE - 15, 'user_signup',     3,  0)
ON CONFLICT (account_id, date, event_type) DO UPDATE
  SET count = EXCLUDED.count, revenue_cents = EXCLUDED.revenue_cents;

-- ── Usage events ──────────────────────────────────────────────────────────────
INSERT INTO usage_events (account_id, metric, quantity, created_at) VALUES
  (1, 'events_processed',   1, NOW() - INTERVAL '1 day'),
  (1, 'events_processed',   1, NOW() - INTERVAL '2 days'),
  (1, 'events_processed',   1, NOW() - INTERVAL '3 days'),
  (1, 'payments_processed', 1, NOW() - INTERVAL '1 day'),
  (1, 'payments_processed', 1, NOW() - INTERVAL '2 days'),
  (1, 'events_processed',   1, NOW() - INTERVAL '4 days'),
  (1, 'payments_processed', 1, NOW() - INTERVAL '4 days'),
  (1, 'events_processed',   1, NOW() - INTERVAL '5 days'),
  (1, 'payments_processed', 1, NOW() - INTERVAL '5 days'),
  (1, 'events_processed',   1, NOW() - INTERVAL '6 days');
