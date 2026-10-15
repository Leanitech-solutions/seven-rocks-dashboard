import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from './server/db';
import { tenants } from './server/schema';
import { sql } from 'drizzle-orm';

async function fix() {
  const duplicates = await db.execute(sql`
    SELECT email, COUNT(*)
    FROM tenants
    GROUP BY email
    HAVING COUNT(*) > 1
  `);
  console.log("Duplicates:", duplicates);
  process.exit(0);
}
fix();
