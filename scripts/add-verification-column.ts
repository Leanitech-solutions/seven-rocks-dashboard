import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Adding verification_checklist column to tenants table in Neon Postgres...');
  try {
    await sql`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS verification_checklist JSONB;
    `;
    console.log('✅ Migration complete: verification_checklist column added successfully.');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
