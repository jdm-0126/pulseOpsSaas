-- ── Members (additional users + memberships) ─────────────────────────────────
INSERT INTO auth_users (email, password_hash, created_at) VALUES
  ('alice@example.com',   '$2b$10$placeholder', NOW() - INTERVAL '30 days'),
  ('bob@example.com',     '$2b$placeholder',    NOW() - INTERVAL '20 days'),
  ('carol@example.com',   '$2b$placeholder',    NOW() - INTERVAL '15 days'),
  ('dave@example.com',    '$2b$placeholder',    NOW() - INTERVAL '10 days')
ON CONFLICT (email) DO NOTHING;

INSERT INTO account_members (account_id, user_id, role, joined_at)
SELECT 1, id, 'admin',  NOW() - INTERVAL '28 days' FROM auth_users WHERE email = 'alice@example.com'
ON CONFLICT (account_id, user_id) DO NOTHING;

INSERT INTO account_members (account_id, user_id, role, joined_at)
SELECT 1, id, 'member', NOW() - INTERVAL '18 days' FROM auth_users WHERE email = 'bob@example.com'
ON CONFLICT (account_id, user_id) DO NOTHING;

INSERT INTO account_members (account_id, user_id, role, joined_at)
SELECT 1, id, 'member', NOW() - INTERVAL '12 days' FROM auth_users WHERE email = 'carol@example.com'
ON CONFLICT (account_id, user_id) DO NOTHING;

INSERT INTO account_members (account_id, user_id, role, joined_at)
SELECT 1, id, 'member', NOW() - INTERVAL '8 days'  FROM auth_users WHERE email = 'dave@example.com'
ON CONFLICT (account_id, user_id) DO NOTHING;

-- ── Pending invites ───────────────────────────────────────────────────────────
INSERT INTO invites (account_id, email, role, token, invited_by, expires_at)
SELECT 1, 'eve@example.com',   'member', 'tok_eve_'   || gen_random_uuid()::text, id, NOW() + INTERVAL '7 days' FROM auth_users WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO invites (account_id, email, role, token, invited_by, expires_at)
SELECT 1, 'frank@example.com', 'admin',  'tok_frank_' || gen_random_uuid()::text, id, NOW() + INTERVAL '7 days' FROM auth_users WHERE email = 'alice@example.com'
ON CONFLICT DO NOTHING;

-- ── Billing customer + subscription ──────────────────────────────────────────
INSERT INTO billing_customers (account_id, stripe_customer_id)
VALUES (1, 'cus_dummy_pulseops')
ON CONFLICT (account_id) DO NOTHING;

INSERT INTO billing_subscriptions (
  account_id, stripe_subscription_id, stripe_price_id,
  status, tier, current_period_start, current_period_end, updated_at
) VALUES (
  1, 'sub_dummy_pulseops', 'price_dummy_free',
  'active', 'free',
  date_trunc('month', NOW()),
  date_trunc('month', NOW()) + INTERVAL '1 month',
  NOW()
) ON CONFLICT (stripe_subscription_id) DO NOTHING;

-- ── Analytics — extend to 30 days ────────────────────────────────────────────
INSERT INTO analytics_daily (account_id, date, event_type, count, revenue_cents) VALUES
  (1, CURRENT_DATE - 16, 'payment_success', 5,  49500),
  (1, CURRENT_DATE - 16, 'user_signup',     3,  0),
  (1, CURRENT_DATE - 17, 'payment_success', 7,  69300),
  (1, CURRENT_DATE - 17, 'user_signup',     4,  0),
  (1, CURRENT_DATE - 18, 'payment_success', 3,  29700),
  (1, CURRENT_DATE - 18, 'user_signup',     2,  0),
  (1, CURRENT_DATE - 19, 'payment_success', 8,  79200),
  (1, CURRENT_DATE - 19, 'user_signup',     5,  0),
  (1, CURRENT_DATE - 20, 'payment_success', 4,  39600),
  (1, CURRENT_DATE - 20, 'user_signup',     3,  0),
  (1, CURRENT_DATE - 21, 'payment_success', 6,  59400),
  (1, CURRENT_DATE - 21, 'user_signup',     4,  0),
  (1, CURRENT_DATE - 22, 'payment_success', 2,  19800),
  (1, CURRENT_DATE - 22, 'user_signup',     1,  0),
  (1, CURRENT_DATE - 23, 'payment_success', 9,  89100),
  (1, CURRENT_DATE - 23, 'user_signup',     6,  0),
  (1, CURRENT_DATE - 24, 'payment_success', 5,  49500),
  (1, CURRENT_DATE - 24, 'user_signup',     3,  0),
  (1, CURRENT_DATE - 25, 'payment_success', 7,  69300),
  (1, CURRENT_DATE - 25, 'user_signup',     5,  0),
  (1, CURRENT_DATE - 26, 'payment_success', 4,  39600),
  (1, CURRENT_DATE - 26, 'user_signup',     2,  0),
  (1, CURRENT_DATE - 27, 'payment_success', 6,  59400),
  (1, CURRENT_DATE - 27, 'user_signup',     4,  0),
  (1, CURRENT_DATE - 28, 'payment_success', 3,  29700),
  (1, CURRENT_DATE - 28, 'user_signup',     2,  0),
  (1, CURRENT_DATE - 29, 'payment_success', 8,  79200),
  (1, CURRENT_DATE - 29, 'user_signup',     5,  0),
  (1, CURRENT_DATE - 30, 'payment_success', 5,  49500),
  (1, CURRENT_DATE - 30, 'user_signup',     3,  0)
ON CONFLICT (account_id, date, event_type) DO UPDATE
  SET count = EXCLUDED.count, revenue_cents = EXCLUDED.revenue_cents;

-- ── Usage events — extend history ─────────────────────────────────────────────
INSERT INTO usage_events (account_id, metric, quantity, created_at) VALUES
  (1, 'events_processed',   5, NOW() - INTERVAL '7 days'),
  (1, 'payments_processed', 4, NOW() - INTERVAL '7 days'),
  (1, 'events_processed',   7, NOW() - INTERVAL '14 days'),
  (1, 'payments_processed', 6, NOW() - INTERVAL '14 days'),
  (1, 'events_processed',   3, NOW() - INTERVAL '21 days'),
  (1, 'payments_processed', 2, NOW() - INTERVAL '21 days'),
  (1, 'events_processed',   8, NOW() - INTERVAL '28 days'),
  (1, 'payments_processed', 7, NOW() - INTERVAL '28 days');
