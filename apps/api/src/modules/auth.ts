import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  hashPassword,
  comparePassword,
  signJWT,
  generateRefreshToken,
  getRefreshTokenExpiry
} from "@pulseops/auth";
import {
  findUserByEmail,
  createUser,
  getUserMembership,
  createSession,
  findSession,
  deleteSession,
  createAccount,
  addMember
} from "@pulseops/db";

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const parsed = CredentialsSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error);

    const { email, password } = parsed.data;

    const existing = await findUserByEmail(email);
    if (existing) return reply.status(409).send({ error: "Email already registered" });

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash);

    // Auto-create account + owner membership on registration
    const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + user.id;
    const account = await createAccount(email.split("@")[0], slug);
    await addMember(account.id, user.id, "owner");

    return reply.status(201).send({ id: user.id, email: user.email, accountId: account.id });
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = CredentialsSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error);

    const { email, password } = parsed.data;

    const user = await findUserByEmail(email);
    if (!user) return reply.status(401).send({ error: "Invalid credentials" });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) return reply.status(401).send({ error: "Invalid credentials" });

    const membership = await getUserMembership(user.id);
    if (!membership) return reply.status(403).send({ error: "No account membership found" });

    const accessToken = signJWT({
      userId: user.id,
      accountId: membership.account_id,
      role: membership.role
    });

    const refreshToken = generateRefreshToken();
    await createSession(user.id, refreshToken, getRefreshTokenExpiry());

    return { accessToken, refreshToken };
  });

  app.post("/auth/refresh", async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) return reply.status(400).send({ error: "Missing refresh token" });

    const session = await findSession(refreshToken);
    if (!session) return reply.status(401).send({ error: "Invalid or expired refresh token" });

    const accessToken = signJWT({
      userId: session.user_id,
      accountId: session.account_id,
      role: session.role
    });

    return { accessToken };
  });

  app.post("/auth/logout", async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) await deleteSession(refreshToken);
    return reply.status(204).send();
  });
}
