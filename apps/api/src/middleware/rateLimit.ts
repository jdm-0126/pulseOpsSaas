import { FastifyRequest, FastifyReply } from "fastify";
import { checkRateLimit } from "@pulseops/cache";

// Default: 100 requests per 60 seconds per tenant
export function rateLimitMiddleware(limit = 100, windowSeconds = 60) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const accountId = req.user?.accountId;
    if (!accountId) return; // unauthenticated requests handled by authMiddleware

    const { allowed, remaining, resetIn } = await checkRateLimit(
      accountId,
      "api",
      limit,
      windowSeconds
    );

    reply.header("X-RateLimit-Limit", limit);
    reply.header("X-RateLimit-Remaining", remaining);
    reply.header("X-RateLimit-Reset", resetIn);

    if (!allowed) {
      return reply.status(429).send({ error: "Rate limit exceeded" });
    }
  };
}
