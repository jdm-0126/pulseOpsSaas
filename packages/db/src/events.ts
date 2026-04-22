import { getPool } from "./index";

export async function insertEvent(event: {
  idempotencyKey: string;
  type: string;
  payload: unknown;
  accountId?: number;
}) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const exists = await client.query(
      "SELECT 1 FROM events WHERE idempotency_key = $1",
      [event.idempotencyKey]
    );

    if (exists.rowCount) {
      await client.query("ROLLBACK");
      return { inserted: false };
    }

    await client.query(
      `INSERT INTO events (idempotency_key, type, payload, account_id)
       VALUES ($1, $2, $3, $4)`,
      [event.idempotencyKey, event.type, event.payload, event.accountId ?? null]
    );

    if (event.accountId) {
      const revenueCents =
        event.type === "payment_success" && typeof event.payload === "object" && event.payload !== null
          ? Number((event.payload as Record<string, unknown>).amount ?? 0)
          : 0;

      await client.query(
        `INSERT INTO analytics_daily (account_id, date, event_type, count, revenue_cents)
         VALUES ($1, CURRENT_DATE, $2, 1, $3)
         ON CONFLICT (account_id, date, event_type)
         DO UPDATE SET count = analytics_daily.count + 1,
                       revenue_cents = analytics_daily.revenue_cents + EXCLUDED.revenue_cents,
                       updated_at = NOW()`,
        [event.accountId, event.type, revenueCents]
      );
    }

    await client.query("COMMIT");
    return { inserted: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getEvents(accountId?: number, limit = 50) {
  const { rows } = await getPool().query(
    `SELECT * FROM events
     WHERE ($1::bigint IS NULL OR account_id = $1)
     ORDER BY created_at DESC LIMIT $2`,
    [accountId ?? null, limit]
  );
  return rows;
}
