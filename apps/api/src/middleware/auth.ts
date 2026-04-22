import { FastifyRequest, FastifyReply } from "fastify";
import { verifyJWT, JWTPayload } from "@pulseops/auth";
import { setRLSContext } from "@pulseops/db";

declare module "fastify" {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const token = auth.split(" ")[1];

  try {
    const payload = verifyJWT(token);
    req.user = payload;

    // Set RLS context for this request
    await setRLSContext(payload.accountId);
  } catch (err) {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
}
