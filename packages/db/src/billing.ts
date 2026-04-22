import { getPool } from "./index";

export async function getSubscription(accountId: number) {
  const { rows } = await getPool().query(
    `SELECT * FROM billing_subscriptions WHERE account_id = $1 LIMIT 1`,
    [accountId]
  );
  return rows[0] ?? null;
}

export async function upsertSubscription(data: {
  accountId: number;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  status: string;
  tier: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
}) {
  await getPool().query(
    `INSERT INTO billing_subscriptions
       (account_id, stripe_subscription_id, stripe_price_id, status, tier,
        current_period_start, current_period_end, canceled_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET
       status               = EXCLUDED.status,
       stripe_price_id      = EXCLUDED.stripe_price_id,
       tier                 = EXCLUDED.tier,
       current_period_start = EXCLUDED.current_period_start,
       current_period_end   = EXCLUDED.current_period_end,
       canceled_at          = EXCLUDED.canceled_at,
       updated_at           = NOW()`,
    [
      data.accountId,
      data.stripeSubscriptionId,
      data.stripePriceId,
      data.status,
      data.tier,
      data.currentPeriodStart,
      data.currentPeriodEnd,
      data.canceledAt
    ]
  );
}

export async function getOrCreateBillingCustomer(
  accountId: number,
  stripeCustomerId: string
) {
  await getPool().query(
    `INSERT INTO billing_customers (account_id, stripe_customer_id)
     VALUES ($1, $2)
     ON CONFLICT (account_id) DO NOTHING`,
    [accountId, stripeCustomerId]
  );
}

export async function getAccountByStripeCustomerId(stripeCustomerId: string) {
  const { rows } = await getPool().query(
    `SELECT account_id FROM billing_customers WHERE stripe_customer_id = $1`,
    [stripeCustomerId]
  );
  return rows[0] ?? null;
}

export async function assertActiveSubscription(accountId: number) {
  const sub = await getSubscription(accountId);
  // No subscription = free tier, which is allowed
  if (!sub) return;
  if (!["active", "trialing"].includes(sub.status)) {
    throw Object.assign(new Error("Active subscription required"), { statusCode: 402 });
  }
}

export async function trackUsage(accountId: number, metric: string, quantity = 1) {
  await getPool().query(
    `INSERT INTO usage_events (account_id, metric, quantity) VALUES ($1, $2, $3)`,
    [accountId, metric, quantity]
  );
}

export async function getMonthlyUsage(accountId: number) {
  const { rows } = await getPool().query(
    `SELECT metric, SUM(quantity)::int AS total
     FROM usage_events
     WHERE account_id = $1
       AND created_at >= date_trunc('month', NOW())
     GROUP BY metric
     ORDER BY metric`,
    [accountId]
  );
  return rows;
}

export async function getUsageHistory(accountId: number, months = 6) {
  const { rows } = await getPool().query(
    `SELECT
       date_trunc('month', created_at) AS month,
       metric,
       SUM(quantity)::int              AS total
     FROM usage_events
     WHERE account_id = $1
       AND created_at >= date_trunc('month', NOW()) - ($2 || ' months')::interval
     GROUP BY month, metric
     ORDER BY month DESC, metric`,
    [accountId, months]
  );
  return rows;
}
