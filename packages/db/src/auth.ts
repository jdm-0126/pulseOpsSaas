import { getPool } from "./index";

export async function findUserByEmail(email: string) {
  const { rows } = await getPool().query(
    "SELECT * FROM auth_users WHERE email = $1",
    [email]
  );
  return rows[0] ?? null;
}

export async function createUser(email: string, passwordHash: string) {
  const { rows } = await getPool().query(
    "INSERT INTO auth_users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
    [email, passwordHash]
  );
  return rows[0];
}

export async function getUserMembership(userId: number) {
  const { rows } = await getPool().query(
    `SELECT account_id, role FROM account_members WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function createSession(
  userId: number,
  refreshToken: string,
  expiresAt: Date
) {
  const { rows } = await getPool().query(
    `INSERT INTO sessions (user_id, refresh_token, expires_at)
     VALUES ($1, $2, $3) RETURNING id`,
    [userId, refreshToken, expiresAt]
  );
  return rows[0];
}

export async function findSession(refreshToken: string) {
  const { rows } = await getPool().query(
    `SELECT s.*, am.account_id, am.role
     FROM sessions s
     JOIN account_members am ON am.user_id = s.user_id
     WHERE s.refresh_token = $1
       AND s.expires_at > NOW()
     LIMIT 1`,
    [refreshToken]
  );
  return rows[0] ?? null;
}

export async function deleteSession(refreshToken: string) {
  await getPool().query(
    "DELETE FROM sessions WHERE refresh_token = $1",
    [refreshToken]
  );
}

export async function setRLSContext(accountId: number) {
  // set_config with is_local=true only works within a transaction on a dedicated connection.
  // Pool-level calls are fire-and-forget on arbitrary connections — use per-request client in routes instead.
  // This is kept for compatibility but analytics/events routes acquire their own client.
  await getPool().query(
    `SELECT set_config('app.current_account_id', $1::text, false)`,
    [accountId]
  );
}
