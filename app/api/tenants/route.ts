import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { tenants } from '../../../server/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { sendTenantOnboardingEmail } from '../../../lib/email';
import crypto from 'crypto';

import { parseSessionCookie, SESSION_COOKIE_NAME } from '../../../lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await parseSessionCookie(sessionVal);

  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allTenants = await db.select().from(tenants);
  return NextResponse.json(allTenants);
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const cleanEmail = data.email.trim().toLowerCase();

    // Check for existing tenant with same email
    const existing = await db.select().from(tenants).where(eq(tenants.email, cleanEmail));
    if (existing.length > 0) {
      return NextResponse.json({ error: 'A resident account with this email address already exists.' }, { status: 400 });
    }

    data.email = cleanEmail;

    // Hash password if provided manually
    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }

    // Generate Onboarding Token & Expiration (7 days validity)
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    data.onboardingToken = token;
    data.onboardingTokenExpiresAt = expiresAt;
    data.onboardingCompleted = false;

    const res = await db.insert(tenants).values(data).returning();
    const createdTenant = res[0];

    // Determine host origin for onboarding URL
    const hostHeader = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const origin = req.headers.get('origin') || `${protocol}://${hostHeader}`;
    const onboardingUrl = `${origin}/onboard?token=${token}`;

    // Send onboarding email — fail loudly if delivery fails
    const emailResult = await sendTenantOnboardingEmail({
      toEmail: createdTenant.email,
      tenantName: createdTenant.fullName,
      onboardingUrl,
      token,
    });

    if (!emailResult.success) {
      console.error(`Email delivery failed for ${createdTenant.email}:`, emailResult.error);
      return NextResponse.json(
        { error: `Tenant created but onboarding email failed to deliver: ${emailResult.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...createdTenant,
      emailSent: true,
    });
  } catch (error: any) {
    console.error('Tenant creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

