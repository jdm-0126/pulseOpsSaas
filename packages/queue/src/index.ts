import { Queue } from "bullmq";

export const eventQueue = new Queue("events", {
  connection: {
    url: process.env.REDIS_URL
  }
});
