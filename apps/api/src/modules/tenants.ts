import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getAccount,
  updateAccount,
  getMembers,
  updateMemberRole,
  removeMember,
  createInvite,
  getInvites,
  findInviteByToken,
  acceptInvite,
  revokeInvite
} from "@pulseops/db";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { writeAuditLog } from "@pulseops/db";
import { cacheInvalidate } from "@pulseops/cache";

const adminOnly = [authMiddleware, requireRole("owner", "admin")];
const ownerOnly = [authMiddleware, requireRole("owner")];

export async function tenantRoutes(app: FastifyInstance) {

  // ─── Account ────────────────────────────────────────────────────────────────

  app.get("/account", { preHandler: authMiddleware }, async (req) => {
    return getAccount(req.user!.accountId);
  });

  app.patch("/account", { preHandler: ownerOnly }, async (req, reply) => {
    const { name } = req.body as { name?: string };
    if (!name) return reply.status(400).send({ error: "name required" });

    const account = await updateAccount(req.user!.accountId, name);
    await writeAuditLog({
      accountId: req.user!.accountId,
      userId: req.user!.userId,
      action: "account.updated",
      metadata: { name }
    });
    await cacheInvalidate(req.user!.accountId, "revenue_summary");
    return account;
  });

  // ─── Members ────────────────────────────────────────────────────────────────

  app.get("/account/members", { preHandler: authMiddleware }, async (req) => {
    return getMembers(req.user!.accountId);
  });

  app.patch("/account/members/:userId/role", { preHandler: adminOnly }, async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { role } = req.body as { role?: string };

    if (!role || !["admin", "member"].includes(role)) {
      return reply.status(400).send({ error: "role must be admin or member" });
    }

    const member = await updateMemberRole(req.user!.accountId, Number(userId), role);
    if (!member) return reply.status(404).send({ error: "Member not found" });

    await writeAuditLog({
      accountId: req.user!.accountId,
      userId: req.user!.userId,
      action: "member.role_updated",
      metadata: { targetUserId: userId, role }
    });

    return member;
  });

  app.delete("/account/members/:userId", { preHandler: adminOnly }, async (req, reply) => {
    const { userId } = req.params as { userId: string };

    if (Number(userId) === req.user!.userId) {
      return reply.status(400).send({ error: "Cannot remove yourself" });
    }

    await removeMember(req.user!.accountId, Number(userId));
    await writeAuditLog({
      accountId: req.user!.accountId,
      userId: req.user!.userId,
      action: "member.removed",
      metadata: { targetUserId: userId }
    });

    return reply.status(204).send();
  });

  // ─── Invites ────────────────────────────────────────────────────────────────

  const InviteSchema = z.object({
    email: z.string().email(),
    role: z.enum(["admin", "member"]).default("member")
  });

  app.get("/account/invites", { preHandler: adminOnly }, async (req) => {
    return getInvites(req.user!.accountId);
  });

  app.post("/account/invites", { preHandler: adminOnly }, async (req, reply) => {
    const parsed = InviteSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: "Validation failed" });

    const invite = await createInvite(
      req.user!.accountId,
      parsed.data.email,
      parsed.data.role,
      req.user!.userId
    );

    await writeAuditLog({
      accountId: req.user!.accountId,
      userId: req.user!.userId,
      action: "invite.created",
      metadata: { email: parsed.data.email, role: parsed.data.role }
    });

    // In production: send invite email with token
    return reply.status(201).send({ token: invite.token, email: invite.email });
  });

  app.delete("/account/invites/:id", { preHandler: adminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await revokeInvite(req.user!.accountId, Number(id));
    return reply.status(204).send();
  });

  // ─── Accept invite (public — user must be registered first) ─────────────────

  app.post("/invites/accept", { preHandler: authMiddleware }, async (req, reply) => {
    const { token } = req.body as { token?: string };
    if (!token) return reply.status(400).send({ error: "token required" });

    const invite = await findInviteByToken(token);
    if (!invite) return reply.status(400).send({ error: "Invalid or expired invite" });

    await acceptInvite(token, req.user!.userId);

    await writeAuditLog({
      accountId: invite.account_id,
      userId: req.user!.userId,
      action: "invite.accepted",
      metadata: { email: invite.email }
    });

    return { accountId: invite.account_id, role: invite.role };
  });
}
