import { getPool } from "./index";
import crypto from "crypto";

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function createAccount(name: string, slug: string) {
  const { rows } = await getPool().query(
    `INSERT INTO accounts (name, slug) VALUES ($1, $2) RETURNING *`,
    [name, slug]
  );
  return rows[0];
}

export async function getAccount(accountId: number) {
  const { rows } = await getPool().query(
    `SELECT * FROM accounts WHERE id = $1`,
    [accountId]
  );
  return rows[0] ?? null;
}

export async function updateAccount(accountId: number, name: string) {
  const { rows } = await getPool().query(
    `UPDATE accounts SET name = $1 WHERE id = $2 RETURNING *`,
    [name, accountId]
  );
  return rows[0] ?? null;
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function getMembers(accountId: number) {
  const { rows } = await getPool().query(
    `SELECT am.role, am.joined_at, u.id, u.email
     FROM account_members am
     JOIN auth_users u ON u.id = am.user_id
     WHERE am.account_id = $1
     ORDER BY am.joined_at ASC`,
    [accountId]
  );
  return rows;
}

export async function addMember(accountId: number, userId: number, role = "member") {
  const { rows } = await getPool().query(
    `INSERT INTO account_members (account_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (account_id, user_id) DO UPDATE SET role = EXCLUDED.role
     RETURNING *`,
    [accountId, userId, role]
  );
  return rows[0];
}

export async function updateMemberRole(accountId: number, userId: number, role: string) {
  const { rows } = await getPool().query(
    `UPDATE account_members SET role = $1
     WHERE account_id = $2 AND user_id = $3
     RETURNING *`,
    [role, accountId, userId]
  );
  return rows[0] ?? null;
}

export async function removeMember(accountId: number, userId: number) {
  await getPool().query(
    `DELETE FROM account_members WHERE account_id = $1 AND user_id = $2`,
    [accountId, userId]
  );
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function createInvite(
  accountId: number,
  email: string,
  role: string,
  invitedBy: number
) {
  const token = crypto.randomBytes(24).toString("hex");
  const { rows } = await getPool().query(
    `INSERT INTO invites (account_id, email, role, token, invited_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [accountId, email, role, token, invitedBy]
  );
  return rows[0];
}

export async function getInvites(accountId: number) {
  const { rows } = await getPool().query(
    `SELECT * FROM invites
     WHERE account_id = $1 AND accepted_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [accountId]
  );
  return rows;
}

export async function findInviteByToken(token: string) {
  const { rows } = await getPool().query(
    `SELECT * FROM invites
     WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
    [token]
  );
  return rows[0] ?? null;
}

export async function acceptInvite(token: string, userId: number) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE invites SET accepted_at = NOW()
       WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()
       RETURNING *`,
      [token]
    );
    const invite = rows[0];
    if (!invite) throw Object.assign(new Error("Invalid or expired invite"), { statusCode: 400 });

    await client.query(
      `INSERT INTO account_members (account_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (account_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [invite.account_id, userId, invite.role]
    );

    await client.query("COMMIT");
    return invite;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function revokeInvite(accountId: number, inviteId: number) {
  await getPool().query(
    `DELETE FROM invites WHERE id = $1 AND account_id = $2`,
    [inviteId, accountId]
  );
}
