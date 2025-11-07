import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Use DATABASE_DIRECT_URL for Drizzle Studio and migrations (direct connection)
// Fall back to DATABASE_URL if not set
const databaseUrl = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DATABASE_DIRECT_URL must be set');
}

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
