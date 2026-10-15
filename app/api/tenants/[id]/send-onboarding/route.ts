import { NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { tenants } from '../../../../../server/schema';
import { eq } from 'drizzle-orm';
import { sendTenantOnboardingEmail } from '../../../../../lib/email';
import crypto from 'crypto';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await db.select().from(tenants).where(eq(tenants.id, id));

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Tenant record not found' }, { status: 404 });
    }

    const tenant = existing[0];

    // Generate new token & 7-day expiration
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update tenant record
    await db
      .update(tenants)
      .set({
        onboardingToken: token,
        onboardingTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id));

    // Determine host origin for onboarding URL
    const hostHeader = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const origin = req.headers.get('origin') || `${protocol}://${hostHeader}`;
    const onboardingUrl = `${origin}/onboard?token=${token}`;

    // Send onboarding email
    const emailResult = await sendTenantOnboardingEmail({
      toEmail: tenant.email,
      tenantName: tenant.fullName,
      onboardingUrl,
      token,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: `Failed to deliver onboarding email: ${emailResult.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Onboarding email sent to ${tenant.email}`,
      emailSent: true,
    });
  } catch (error: any) {
    console.error('Failed to send onboarding email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

