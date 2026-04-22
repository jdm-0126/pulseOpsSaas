import { getPool } from "./index";

export async function writeAuditLog(entry: {
  accountId: number;
  userId?: number;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  await getPool().query(
    `INSERT INTO audit_logs (account_id, user_id, action, metadata)
     VALUES ($1, $2, $3, $4)`,
    [entry.accountId, entry.userId ?? null, entry.action, entry.metadata ?? null]
  );
}

export async function getAuditLogs(accountId: number, limit = 50) {
  const { rows } = await getPool().query(
    `SELECT * FROM audit_logs
     WHERE account_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [accountId, limit]
  );
  return rows;
}
