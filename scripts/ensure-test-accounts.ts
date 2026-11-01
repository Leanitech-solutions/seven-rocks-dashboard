import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../server/db';
import { users, tenants } from '../server/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  
  // 1. Admin account: admin@sevenrocks.com / password123
  const adminEmail = 'admin@sevenrocks.com';
  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));
  if (existingAdmin.length > 0) {
    await db.update(users).set({
      passwordHash: hash,
      status: 'active',
      role: 'super_admin'
    }).where(eq(users.email, adminEmail));
    console.log(`✅ Admin updated: ${adminEmail}`);
  } else {
    await db.insert(users).values({
      email: adminEmail,
      fullName: 'System Administrator',
      passwordHash: hash,
      role: 'super_admin',
      status: 'active'
    });
    console.log(`✅ Admin created: ${adminEmail}`);
  }

  // 2. Tenant accounts:
  // Update alex.l@example.com (Alexander Lindqvist)
  await db.update(tenants).set({
    passwordHash: hash,
    status: 'Checked-In'
  }).where(eq(tenants.email, 'alex.l@example.com'));
  
  await db.update(users).set({ passwordHash: hash, status: 'active' }).where(eq(users.email, 'alex.l@example.com'));
  console.log('✅ Tenant updated: alex.l@example.com');

  // Update nimela4355@neplis.com
  await db.update(tenants).set({
    passwordHash: hash,
    status: 'Checked-In'
  }).where(eq(tenants.email, 'nimela4355@neplis.com'));
  
  await db.update(users).set({ passwordHash: hash, status: 'active' }).where(eq(users.email, 'nimela4355@neplis.com'));
  console.log('✅ Tenant updated: nimela4355@neplis.com');

  console.log('Credentials setup complete!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
