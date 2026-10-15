import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function clearDb() {
  console.log("Clearing database...");
  try {
    await db.execute(sql`
      TRUNCATE TABLE 
        users, 
        tenants, 
        maintenance_tickets, 
        housekeeping_requests, 
        add_on_services, 
        add_on_requests, 
        invoices, 
        inspections, 
        inventory_photos 
      CASCADE;
    `);
    console.log("Database cleared successfully!");
  } catch (error) {
    console.error("Failed to clear database:", error);
  }
  process.exit(0);
}

clearDb();
