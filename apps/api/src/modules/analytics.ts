import { FastifyInstance } from "fastify";
import { getPool, getAuditLogs, writeAuditLog } from "@pulseops/db";
import { cacheGet, cacheSet, cacheInvalidate } from "@pulseops/cache";
import { authMiddleware } from "../middleware/auth";
import { billingMiddleware } from "../middleware/billing";
import { rateLimitMiddleware } from "../middleware/rateLimit";
import { requireRole } from "../middleware/role";

const preHandler = [authMiddleware, rateLimitMiddleware(), billingMiddleware];

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/analytics/revenue", { preHandler }, async (req) => {
    const { from = "2026-01-01", to = "2026-12-31" } = req.query as { from?: string; to?: string };
    const client = await getPool().connect();
    try {
      await client.query(`SELECT set_config('app.current_account_id', $1::text, true)`, [req.user!.accountId]);
      const { rows } = await client.query(
        `SELECT date, SUM(revenue_cents) AS revenue_cents
         FROM analytics_daily
         WHERE account_id = $1 AND date BETWEEN $2 AND $3
         GROUP BY date ORDER BY date ASC`,
        [req.user!.accountId, from, to]
      );
      return rows;
    } finally { client.release(); }
  });

  app.get("/analytics/events", { preHandler }, async (req) => {
    const { from, to, type } = req.query as { from?: string; to?: string; type?: string };
    const client = await getPool().connect();
    try {
      await client.query(`SELECT set_config('app.current_account_id', $1::text, true)`, [req.user!.accountId]);
      const { rows } = await client.query(
        `SELECT date, event_type, SUM(count) AS count
         FROM analytics_daily
         WHERE account_id = $1
           AND ($2::date IS NULL OR date >= $2::date)
           AND ($3::date IS NULL OR date <= $3::date)
           AND ($4::text IS NULL OR event_type = $4)
         GROUP BY date, event_type ORDER BY date ASC`,
        [req.user!.accountId, from ?? null, to ?? null, type ?? null]
      );
      return rows;
    } finally { client.release(); }
  });

  app.get("/analytics/signups", { preHandler }, async (req) => {
    const client = await getPool().connect();
    try {
      await client.query(`SELECT set_config('app.current_account_id', $1::text, true)`, [req.user!.accountId]);
      const { rows } = await client.query(
        `SELECT date, SUM(count) AS count
         FROM analytics_daily
         WHERE account_id = $1 AND event_type = 'user_signup'
         GROUP BY date ORDER BY date ASC`,
        [req.user!.accountId]
      );
      return rows;
    } finally { client.release(); }
  });

  // Summary — no cache, always fresh
  app.get("/analytics/summary", { preHandler }, async (req) => {
    const accountId = req.user!.accountId;
    const client = await getPool().connect();
    try {
      await client.query(`SELECT set_config('app.current_account_id', $1::text, true)`, [accountId]);
      const { rows } = await client.query(
        `SELECT
           SUM(count)           AS total_events,
           SUM(revenue_cents)   AS total_revenue_cents,
           COUNT(DISTINCT date) AS active_days
         FROM analytics_daily
         WHERE account_id = $1`,
        [accountId]
      );
      return rows[0];
    } finally {
      client.release();
    }
  });

  // Audit log — admin only
  app.get(
    "/audit-logs",
    { preHandler: [authMiddleware, requireRole("admin", "owner")] },
    async (req) => {
      const { limit } = req.query as { limit?: string };
      await writeAuditLog({
        accountId: req.user!.accountId,
        userId: req.user!.userId,
        action: "audit_logs.viewed"
      });
      return getAuditLogs(req.user!.accountId, limit ? Number(limit) : 50);
    }
  );
}
