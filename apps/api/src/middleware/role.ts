import { FastifyRequest, FastifyReply } from "fastify";

export function requireRole(...roles: string[]) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    if (!req.user || !roles.includes(req.user.role)) {
      return reply.status(403).send({ error: "Forbidden" });
    }
  };
}
