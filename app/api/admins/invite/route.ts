import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { users } from '../../../../server/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '../../../../lib/email';
import { parseSessionCookie, SESSION_COOKIE_NAME } from '../../../../lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { email, department } = await req.json();
    const cookieStore = await cookies();
    const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await parseSessionCookie(sessionVal);

    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can invite admins' }, { status: 403 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(users).values({
      email,
      passwordHash: '',
      role: 'admin',
      fullName: 'Administrator',
      status: 'pending',
      department: Array.isArray(department) ? department : [],
      onboardingToken: token,
      onboardingTokenExpiresAt: expiresAt,
    });

    const inviteUrl = `${req.headers.get('origin') || 'http://localhost:3000'}/onboard?token=${token}`;

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

    return NextResponse.json({ success: true, message: 'Invitation sent successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
