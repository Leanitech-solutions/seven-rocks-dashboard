import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be a Neon connection string");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("Seeding admin account...");
  
  const email = "admin@sevenrocks.com";
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await db.insert(schema.users).values({
      email,
      passwordHash,
      role: 'super_admin',
      fullName: 'System Administrator'
    }).onConflictDoUpdate({
      target: schema.users.email,
      set: {
        passwordHash,
        role: 'super_admin',
        fullName: 'System Administrator',
        updatedAt: new Date()
      }
    });
    console.log(`Admin account seeded/re-seeded successfully!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error: any) {
    console.error("Error seeding admin account:", error);
  }
}

seed().catch(console.error);
