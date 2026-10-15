import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '../server/db';
import { users } from '../server/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '../lib/email';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/seed-admin.ts <super-admin-email> <super-admin-password> [invite-email-1] [invite-email-2] ...');
    process.exit(1);
  }

  const [superAdminEmail, superAdminPass, ...inviteEmails] = args;

  console.log('----------------------------------------------------');
  console.log('👑 Seven Rocks Admin Seeder');
  console.log('----------------------------------------------------');

  try {
    // 1. Create Super Admin
    const existingSuperAdmin = await db.select().from(users).where(eq(users.email, superAdminEmail));
    if (existingSuperAdmin.length > 0) {
      console.log(`⚠️ User ${superAdminEmail} already exists. Updating role to super_admin and resetting password.`);
      await db.update(users).set({
        role: 'super_admin',
        passwordHash: await bcrypt.hash(superAdminPass, 10),
        status: 'active',
      }).where(eq(users.email, superAdminEmail));
      console.log(`✅ Super admin updated: ${superAdminEmail}`);
    } else {
      await db.insert(users).values({
        email: superAdminEmail,
        passwordHash: await bcrypt.hash(superAdminPass, 10),
        role: 'super_admin',
        fullName: 'Super Administrator',
        status: 'active',
      });
      console.log(`✅ Super admin created: ${superAdminEmail}`);
    }

    // 2. Invite other admins
    for (const email of inviteEmails) {
      const existingUser = await db.select().from(users).where(eq(users.email, email));
      
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      if (existingUser.length > 0) {
        console.log(`⚠️ User ${email} already exists. Skipping invite.`);
        continue;
      }

      await db.insert(users).values({
        email,
        passwordHash: '',
        role: 'admin',
        fullName: 'Administrator',
        status: 'pending',
        onboardingToken: token,
        onboardingTokenExpiresAt: expiresAt,
      });

      console.log(`📩 Generated invite for ${email}...`);

      const inviteUrl = `http://localhost:3000/onboard?token=${token}`;

      await sendEmail({
        to: email,
        subject: 'Invitation to manage Seven Rocks Co-Living',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #059669;">Admin Invitation</h2>
            <p>You have been invited to join the Seven Rocks Property Management team as an Administrator.</p>
            <p>Click the link below to set your password and access the dashboard:</p>
            <div style="margin: 24px 0;">
              <a href="${inviteUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Accept Invitation & Set Password</a>
            </div>
            <p style="font-size: 13px; color: #64748b;">Or copy this link: <br>${inviteUrl}</p>
          </div>
        `,
      });

      console.log(`✅ Invitation sent to ${email}`);
    }

    console.log('----------------------------------------------------');
    console.log('🎉 Admin seeding complete!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error seeding admins:', err.message);
    process.exit(1);
  }
}

main();
