-- Seed all data for the current user.
-- Replace 'your@email.com' with the email you registered with.

DO $$
DECLARE
  v_user_id    BIGINT;
  v_account_id BIGINT;
  v_alice_id   BIGINT;
BEGIN
  SELECT id INTO v_user_id FROM auth_users WHERE email = 'jojo@pulseops.com';
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found — update the email at the top of this file';
  END IF;

  SELECT account_id INTO v_account_id FROM account_members WHERE user_id = v_user_id LIMIT 1;
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'No account membership found for this user';
  END IF;

  -- ── Team members ────────────────────────────────────────────────────────────
  INSERT INTO auth_users (email, password_hash, created_at) VALUES
    ('alice@example.com', '$2b$10$placeholder', NOW() - INTERVAL '30 days'),
    ('bob@example.com',   '$2b$10$placeholder', NOW() - INTERVAL '20 days'),
    ('carol@example.com', '$2b$10$placeholder', NOW() - INTERVAL '15 days'),
    ('dave@example.com',  '$2b$10$placeholder', NOW() - INTERVAL '10 days')
  ON CONFLICT (email) DO NOTHING;

  SELECT id INTO v_alice_id FROM auth_users WHERE email = 'alice@example.com';

  INSERT INTO account_members (account_id, user_id, role, joined_at)
  SELECT v_account_id, id, 'admin',  NOW() - INTERVAL '28 days' FROM auth_users WHERE email = 'alice@example.com'
  ON CONFLICT (account_id, user_id) DO NOTHING;

  INSERT INTO account_members (account_id, user_id, role, joined_at)
  SELECT v_account_id, id, 'member', NOW() - INTERVAL '18 days' FROM auth_users WHERE email = 'bob@example.com'
  ON CONFLICT (account_id, user_id) DO NOTHING;

  INSERT INTO account_members (account_id, user_id, role, joined_at)
  SELECT v_account_id, id, 'member', NOW() - INTERVAL '12 days' FROM auth_users WHERE email = 'carol@example.com'
  ON CONFLICT (account_id, user_id) DO NOTHING;

  INSERT INTO account_members (account_id, user_id, role, joined_at)
  SELECT v_account_id, id, 'member', NOW() - INTERVAL '8 days'  FROM auth_users WHERE email = 'dave@example.com'
  ON CONFLICT (account_id, user_id) DO NOTHING;

  -- ── Pending invites ──────────────────────────────────────────────────────────
  INSERT INTO invites (account_id, email, role, token, invited_by, expires_at)
  VALUES
    (v_account_id, 'eve@example.com',   'member', 'tok_eve_'   || gen_random_uuid()::text, v_alice_id, NOW() + INTERVAL '7 days'),
    (v_account_id, 'frank@example.com', 'admin',  'tok_frank_' || gen_random_uuid()::text, v_alice_id, NOW() + INTERVAL '7 days')
  ON CONFLICT DO NOTHING;

  -- ── Events ──────────────────────────────────────────────────────────────────
  INSERT INTO events (idempotency_key, type, payload, account_id, created_at) VALUES
    ('evt_001', 'payment_success', '{"amount":4900,  "currency":"usd"}', v_account_id, NOW() - INTERVAL '1 day'),
    ('evt_002', 'payment_success', '{"amount":9900,  "currency":"usd"}', v_account_id, NOW() - INTERVAL '2 days'),
    ('evt_003', 'user_signup',     '{"email":"alice@example.com"}',      v_account_id, NOW() - INTERVAL '2 days'),
    ('evt_004', 'payment_success', '{"amount":2900,  "currency":"usd"}', v_account_id, NOW() - INTERVAL '3 days'),
    ('evt_005', 'user_signup',     '{"email":"bob@example.com"}',        v_account_id, NOW() - INTERVAL '3 days'),
    ('evt_006', 'payment_success', '{"amount":14900, "currency":"usd"}', v_account_id, NOW() - INTERVAL '4 days'),
    ('evt_007', 'user_signup',     '{"email":"carol@example.com"}',      v_account_id, NOW() - INTERVAL '5 days'),
    ('evt_008', 'payment_success', '{"amount":4900,  "currency":"usd"}', v_account_id, NOW() - INTERVAL '5 days'),
    ('evt_009', 'payment_success', '{"amount":9900,  "currency":"usd"}', v_account_id, NOW() - INTERVAL '6 days'),
    ('evt_010', 'user_signup',     '{"email":"dave@example.com"}',       v_account_id, NOW() - INTERVAL '7 days'),
    ('evt_011', 'payment_success', '{"amount":4900,  "currency":"usd"}', v_account_id, NOW() - INTERVAL '8 days'),
    ('evt_012', 'payment_success', '{"amount":19900, "currency":"usd"}', v_account_id, NOW() - INTERVAL '9 days'),
    ('evt_013', 'user_signup',     '{"email":"eve@example.com"}',        v_account_id, NOW() - INTERVAL '10 days'),
    ('evt_014', 'payment_success', '{"amount":4900,  "currency":"usd"}', v_account_id, NOW() - INTERVAL '11 days'),
    ('evt_015', 'user_signup',     '{"email":"frank@example.com"}',      v_account_id, NOW() - INTERVAL '12 days')
  ON CONFLICT (idempotency_key) DO UPDATE SET account_id = v_account_id;

  -- ── Billing ──────────────────────────────────────────────────────────────────
  INSERT INTO billing_customers (account_id, stripe_customer_id)
  VALUES (v_account_id, 'cus_dummy_' || v_account_id)
  ON CONFLICT (account_id) DO NOTHING;

  INSERT INTO billing_subscriptions (
    account_id, stripe_subscription_id, stripe_price_id,
    status, tier, current_period_start, current_period_end, updated_at
  ) VALUES (
    v_account_id, 'sub_dummy_' || v_account_id, 'price_dummy_pro',
    'active', 'pro',
    date_trunc('month', NOW()),
    date_trunc('month', NOW()) + INTERVAL '1 month',
    NOW()
  ) ON CONFLICT (stripe_subscription_id) DO NOTHING;

  -- ── Analytics daily rollups (30 days) ────────────────────────────────────────
  INSERT INTO analytics_daily (account_id, date, event_type, count, revenue_cents)
  SELECT v_account_id, CURRENT_DATE - s, 'payment_success',
    (ARRAY[3,5,2,6,4,7,3,8,4,5,2,9,3,6,4,5,7,3,8,4,6,2,9,5,7,4,6,3,8,5])[s],
    (ARRAY[3,5,2,6,4,7,3,8,4,5,2,9,3,6,4,5,7,3,8,4,6,2,9,5,7,4,6,3,8,5])[s] * 9900
  FROM generate_series(1, 30) s
  ON CONFLICT (account_id, date, event_type) DO UPDATE
    SET count = EXCLUDED.count, revenue_cents = EXCLUDED.revenue_cents;

  INSERT INTO analytics_daily (account_id, date, event_type, count, revenue_cents)
  SELECT v_account_id, CURRENT_DATE - s, 'user_signup',
    (ARRAY[2,4,1,3,2,5,2,6,3,4,1,7,2,4,3,3,4,2,5,3,4,1,6,3,5,2,4,2,5,3])[s],
    0
  FROM generate_series(1, 30) s
  ON CONFLICT (account_id, date, event_type) DO UPDATE
    SET count = EXCLUDED.count, revenue_cents = EXCLUDED.revenue_cents;

  -- ── Usage events ─────────────────────────────────────────────────────────────
  INSERT INTO usage_events (account_id, metric, quantity, created_at)
  SELECT v_account_id, 'events_processed',   s * 2, NOW() - (s || ' days')::INTERVAL
  FROM generate_series(1, 30) s;

  INSERT INTO usage_events (account_id, metric, quantity, created_at)
  SELECT v_account_id, 'payments_processed', s,     NOW() - (s || ' days')::INTERVAL
  FROM generate_series(1, 30) s;

  RAISE NOTICE 'Seeded account_id=% for user_id=%', v_account_id, v_user_id;
END $$;
