import { FastifyInstance } from "fastify";
import OpenAI from "openai";
import { getPool } from "@pulseops/db";
import { authMiddleware } from "../middleware/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function aiRoutes(app: FastifyInstance) {
  app.post("/ai/ask", { preHandler: authMiddleware }, async (req, reply) => {
    const { question } = req.body as { question?: string };
    if (!question) return reply.status(400).send({ error: "question required" });

    const accountId = req.user!.accountId;

    // Fetch live context for this tenant
    const client = await getPool().connect();
    let context = "";
    try {
      await client.query(`SELECT set_config('app.current_account_id', $1::text, true)`, [accountId]);

      const [summary, topEvents, usage] = await Promise.all([
        client.query(
          `SELECT SUM(count) AS total_events, SUM(revenue_cents) AS total_revenue_cents,
                  COUNT(DISTINCT date) AS active_days
           FROM analytics_daily WHERE account_id = $1`,
          [accountId]
        ),
        client.query(
          `SELECT event_type, SUM(count) AS total
           FROM analytics_daily WHERE account_id = $1
           GROUP BY event_type ORDER BY total DESC`,
          [accountId]
        ),
        client.query(
          `SELECT metric, SUM(quantity)::int AS total
           FROM usage_events WHERE account_id = $1
             AND created_at >= date_trunc('month', NOW())
           GROUP BY metric`,
          [accountId]
        )
      ]);

      const s = summary.rows[0];
      context = `
Account analytics summary:
- Total events: ${s.total_events ?? 0}
- Total revenue: $${((Number(s.total_revenue_cents) || 0) / 100).toFixed(2)}
- Active days: ${s.active_days ?? 0}

Event breakdown:
${topEvents.rows.map(r => `- ${r.event_type}: ${r.total}`).join("\n")}

Usage this month:
${usage.rows.length ? usage.rows.map(r => `- ${r.metric}: ${r.total}`).join("\n") : "- No usage recorded"}
      `.trim();
    } finally {
      client.release();
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful analytics assistant for PulseOps, an event ingestion platform.
Answer questions about the user's data concisely. Only use the data provided.
If asked something outside the data, say you don't have that information.`
        },
        {
          role: "user",
          content: `Here is my account data:\n\n${context}\n\nQuestion: ${question}`
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    });

    const answer = completion.choices[0]?.message?.content ?? "No response";
    return { answer };
  });
}
