import { FastifyInstance } from "fastify";
import Stripe from "stripe";
import {
  upsertSubscription,
  getOrCreateBillingCustomer,
  getAccountByStripeCustomerId,
  getMonthlyUsage,
  getUsageHistory,
  getPool
} from "@pulseops/db";
import { authMiddleware } from "../middleware/auth";
import { logger } from "@pulseops/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil"
});

// Map Stripe price IDs to internal tiers — extend as needed
function getTierFromPriceId(priceId: string | null): string {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_PRO ?? ""]: "pro",
    [process.env.STRIPE_PRICE_ENTERPRISE ?? ""]: "enterprise"
  };
  return (priceId && map[priceId]) || "free";
}

export async function billingRoutes(app: FastifyInstance) {
  // Create Stripe Checkout session
  app.post("/billing/checkout", { preHandler: authMiddleware }, async (req, reply) => {
    const { priceId } = req.body as { priceId: string };
    if (!priceId) return reply.status(400).send({ error: "priceId required" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/billing/cancel`,
      metadata: { accountId: String(req.user!.accountId) }
    });

    return { url: session.url };
  });

  // Stripe customer portal
  app.post("/billing/portal", { preHandler: authMiddleware }, async (req, reply) => {
    const { rows } = await getPool().query(
      `SELECT stripe_customer_id FROM billing_customers WHERE account_id = $1`,
      [req.user!.accountId]
    );

    if (!rows[0]) return reply.status(404).send({ error: "No billing customer found" });

    const session = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: `${process.env.APP_URL}/billing`
    });

    return { url: session.url };
  });

  // Current month usage
  app.get("/billing/usage", { preHandler: authMiddleware }, async (req) => {
    return getMonthlyUsage(req.user!.accountId);
  });

  // Usage history (last N months)
  app.get("/billing/usage/history", { preHandler: authMiddleware }, async (req) => {
    const { months } = req.query as { months?: string };
    return getUsageHistory(req.user!.accountId, months ? Number(months) : 6);
  });

  // Stripe webhook — verify signature + sync subscription state
  app.post("/webhooks/stripe", async (req, reply) => {
    const sig = req.headers["stripe-signature"] as string;
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        secret
      );
    } catch (err) {
      logger.warn({ err }, "Stripe webhook signature verification failed");
      return reply.status(400).send({ error: "Invalid signature" });
    }

    const safeType = String(event.type).replace(/[\r\n]/g, "");
    logger.info({ type: safeType }, "Stripe webhook received");

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const accountId = Number(session.metadata?.accountId);
        if (session.customer && accountId) {
          await getOrCreateBillingCustomer(accountId, session.customer as string);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = await getAccountByStripeCustomerId(sub.customer as string);
        if (!customer) break;

        const priceId = sub.items.data[0]?.price.id ?? null;
        await upsertSubscription({
          accountId: customer.account_id,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          status: sub.status,
          tier: getTierFromPriceId(priceId),
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null
        });
        break;
      }
    }

    return { received: true };
  });
}
