import { FastifyRequest, FastifyReply } from "fastify";
import { assertActiveSubscription } from "@pulseops/db";

export async function billingMiddleware(req: FastifyRequest, reply: FastifyReply) {
  try {
    await assertActiveSubscription(req.user!.accountId);
  } catch (err: any) {
    return reply.status(err.statusCode ?? 402).send({ error: err.message });
  }
}
