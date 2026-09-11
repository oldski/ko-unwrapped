import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Database = ReturnType<typeof createDb>;

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  return drizzle(postgres(connectionString), { schema });
}

let instance: Database | null = null;

/**
 * Resolve the connection on first use.
 *
 * Connecting at import time meant a missing DATABASE_URL failed the whole
 * Next.js build: collecting page data imports every route module, so the
 * throw fired for routes that never touch the database. Resolving lazily
 * keeps the failure at the request that actually needs a connection.
 */
export function getDb(): Database {
  if (!instance) {
    instance = createDb();
  }

  return instance;
}

/**
 * Drop-in for the previous eagerly-created instance: every property access
 * resolves the connection first, so existing `db.select(...)` call sites
 * keep working unchanged.
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const resolved = getDb() as unknown as Record<string | symbol, unknown>;
    const value = resolved[property];

    return typeof value === 'function' ? value.bind(resolved) : value;
  },
});
