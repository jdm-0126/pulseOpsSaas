import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../../.env") });
import Fastify from "fastify";
import { EventSchema } from "@pulseops/types";
import { insertEvent, getEvents } from "@pulseops/db";
import { eventQueue } from "@pulseops/queue";
import { authRoutes } from "./modules/auth";
import { billingRoutes } from "./modules/billing";
import { analyticsRoutes } from "./modules/analytics";
import { tenantRoutes } from "./modules/tenants";
import { aiRoutes } from "./modules/ai";
import { authMiddleware } from "./middleware/auth";
import { billingMiddleware } from "./middleware/billing";
import { rateLimitMiddleware } from "./middleware/rateLimit";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");

async function start() {
  const app = Fastify({ logger: true });

  // Store raw body for Stripe webhook verification
  app.addHook("preHandler", async (req, reply) => {
    if (req.url.startsWith("/webhooks/stripe")) {
      const chunks: Buffer[] = [];
      const onData = (chunk: Buffer) => chunks.push(chunk);
      const onEnd = () => {
        (req as any).rawBody = Buffer.concat(chunks);
        req.raw.removeListener("data", onData);
        req.raw.removeListener("end", onEnd);
      };
      req.raw.on("data", onData);
      req.raw.on("end", onEnd);
    }
  });

  app.addHook("onRequest", async (req, reply) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const origin = req.headers["origin"];
      const isWebhook = req.url.startsWith("/webhooks/");
      if (!isWebhook && origin && !ALLOWED_ORIGINS.includes(origin)) {
        return reply.status(403).send({ error: "Forbidden" });
      }
    }
  });

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(authRoutes);
  await app.register(billingRoutes);
  await app.register(analyticsRoutes);
  await app.register(tenantRoutes);
  await app.register(aiRoutes);

  const eventsPreHandler = [authMiddleware, rateLimitMiddleware(), billingMiddleware] as any;

  app.get("/events", { preHandler: eventsPreHandler }, async (req) => {
    return getEvents(req.user!.accountId);
  });

  app.post("/events", { preHandler: eventsPreHandler }, async (req, reply) => {
    const parsed = EventSchema.safeParse(req.body);
    // Return sanitized field errors only — never reflect raw input back (XSS)
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Validation failed",
        fields: parsed.error.errors.map((e) => ({
          path: e.path,
          message: e.message
        }))
      });
    }

    const event = { ...parsed.data, accountId: req.user!.accountId };
    const safeType = event.type.replace(/[\r\n]/g, "");
    const safeKey = event.idempotencyKey.replace(/[\r\n]/g, "");
    app.log.info({ type: safeType, key: safeKey }, "Ingesting event");

    const result = await insertEvent(event);

    if (result.inserted) {
      await eventQueue.add("process-event", event);
    }

    return { success: true, inserted: result.inserted };
  });


  await app.listen({ port: Number(process.env.PORT) || 3001, host: "0.0.0.0" });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
