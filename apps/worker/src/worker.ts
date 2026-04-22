import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../../.env") });
import { Worker } from "bullmq";
import { logger } from "@pulseops/logger";
import { trackUsage } from "@pulseops/db";
import type { EventInput } from "@pulseops/types";

const worker = new Worker<EventInput>(
  "events",
  async (job) => {
    const event = job.data;
    const safeType = String(event.type).replace(/[\r\n]/g, "");
    const safeKey = String(event.idempotencyKey).replace(/[\r\n]/g, "");
    logger.info({ type: safeType, key: safeKey }, "Processing event");

    if (event.type === "payment_success") {
      logger.info("Handle revenue update");
    } else if (event.type === "user_signup") {
      logger.info("Handle user signup");
    }

    // Track usage per tenant if accountId is present
    if (event.accountId) {
      await trackUsage(event.accountId, "events_processed");

      if (event.type === "payment_success") {
        await trackUsage(event.accountId, "payments_processed");
      }
    }
  },
  {
    connection: { url: process.env.REDIS_URL }
  }
);

worker.on("completed", (job) => {
  logger.info(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Job failed");
});
