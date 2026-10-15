/**
 * Migration script: Add 'department' column to the 'users' table.
 * Run with: npx tsx scripts/migrate-add-department.ts
 */
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log('Adding department column to users table...');
  
  await sql`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS department jsonb DEFAULT '[]'::jsonb
  `;

  console.log('✅ Migration complete: department column added to users table.');
  
  // Set super_admin users to have all departments by default
  await sql`
    UPDATE users 
    SET department = '["housekeeping","maintenance","addons","tenants","notifications"]'::jsonb
    WHERE role = 'super_admin' AND (department IS NULL OR department = '[]'::jsonb)
  `;

  console.log('✅ Super admins updated with all department access.');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
