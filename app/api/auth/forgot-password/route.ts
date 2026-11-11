import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { tenants, users, activityLogs } from '../../../../server/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../../../../lib/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check in tenants
    const matchedTenants = await db.select().from(tenants).where(eq(tenants.email, cleanEmail));
    // 2. Check in users/staff
    const matchedUsers = await db.select().from(users).where(eq(users.email, cleanEmail));

    const matchedTenant = matchedTenants[0];
    const matchedUser = matchedUsers[0];

    // Generic security message (prevents account enumeration attacks)
    const successResponse = {
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link to it. Please check your inbox and spam folder.',
    };

    if (!matchedTenant && !matchedUser) {
      console.log(`🔒 [FORGOT-PASSWORD] Reset requested for non-existent email: ${cleanEmail}`);
      // Sleep slightly to mitigate timing attacks
      await new Promise(r => setTimeout(r, 200));
      return NextResponse.json(successResponse);
    }

    // Generate secure random reset token and 1-hour expiration
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    let recipientName = 'Resident';

    if (matchedTenant) {
      recipientName = matchedTenant.fullName;
      await db.update(tenants).set({
        resetPasswordToken: token,
        resetPasswordTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      }).where(eq(tenants.id, matchedTenant.id));
    } else if (matchedUser) {
      recipientName = matchedUser.fullName;
      await db.update(users).set({
        resetPasswordToken: token,
        resetPasswordTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      }).where(eq(users.id, matchedUser.id));
    }

    // Determine host origin for reset URL
    const hostHeader = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const origin = req.headers.get('origin') || `${protocol}://${hostHeader}`;
    const resetUrl = `${origin}/reset-password?token=${token}`;

    console.log(`🔑 [FORGOT-PASSWORD] Generated reset token for ${cleanEmail}: ${token}`);

    // Send reset email
    const emailResult = await sendPasswordResetEmail({
      toEmail: cleanEmail,
      userName: recipientName,
      resetUrl,
      token,
    });

    if (!emailResult.success) {
      console.error(`❌ [FORGOT-PASSWORD] Failed to deliver password reset email to ${cleanEmail}:`, emailResult.error);
      return NextResponse.json({
        error: `Could not send password reset email: ${emailResult.error}`,
      }, { status: 500 });
    }

    // Optional: Log activity
    try {
      await db.insert(activityLogs).values({
        type: 'tenant',
        user: cleanEmail,
        action: 'Password Reset Requested',
        details: `Password reset link dispatched to ${cleanEmail}. Link valid for 1 hour.`,
      });
    } catch (logErr) {
      console.warn('Could not record activity log for password reset:', logErr);
    }

    return NextResponse.json(successResponse);
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred processing your request.' }, { status: 500 });
  }
}
