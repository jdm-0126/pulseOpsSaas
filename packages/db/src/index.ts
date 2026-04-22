import { Pool } from "pg";

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    if (!/^postgres(ql)?:\/\//.test(url)) throw new Error("DATABASE_URL must be a PostgreSQL connection string");
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

export * from "./events";
export * from "./auth";
export * from "./billing";
export * from "./audit";
export * from "./tenants";
