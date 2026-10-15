import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Adding onboarding columns to tenants table...');
  try {
    await sql`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS onboarding_token TEXT,
        ADD COLUMN IF NOT EXISTS onboarding_token_expires_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE
    `;
    console.log('✅ Migration complete — columns added successfully.');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
