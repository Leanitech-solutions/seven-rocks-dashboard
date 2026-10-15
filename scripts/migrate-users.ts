import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_token text`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_token_expires_at timestamp`);
  await db.execute(sql`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
  console.log("Done");
  process.exit(0);
}
migrate();
