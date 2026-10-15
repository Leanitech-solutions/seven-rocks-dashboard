import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { tenants, users } from '../../../server/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { setAuthCookies } from '../../../lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Onboarding token is required' }, { status: 400 });
    }

    // Check tenants first
    let matchedTenant = await db.select().from(tenants).where(eq(tenants.onboardingToken, token));
    
    if (matchedTenant.length > 0) {
      const tenant = matchedTenant[0];
      if (tenant.onboardingTokenExpiresAt && new Date(tenant.onboardingTokenExpiresAt) < new Date()) {
        return NextResponse.json({ error: 'This onboarding link has expired. Please request a new link from your property manager.' }, { status: 410 });
      }
      return NextResponse.json({
        success: true,
        type: 'tenant',
        tenant: {
          id: tenant.id,
          fullName: tenant.fullName,
          email: tenant.email,
          roomNumber: tenant.roomNumber,
          propertyLocation: tenant.propertyLocation,
          hasPassword: !!tenant.passwordHash,
        },
      });
    }

    // If not a tenant, check admins/users
    let matchedUser = await db.select().from(users).where(eq(users.onboardingToken, token));

    if (matchedUser.length > 0) {
      const user = matchedUser[0];
      if (user.onboardingTokenExpiresAt && new Date(user.onboardingTokenExpiresAt) < new Date()) {
        return NextResponse.json({ error: 'This onboarding link has expired. Please ask the super admin to resend it.' }, { status: 410 });
      }
      return NextResponse.json({
        success: true,
        type: 'admin',
        tenant: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          hasPassword: !!user.passwordHash,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid or expired onboarding token.' }, { status: 404 });
  } catch (error: any) {
    console.error('Failed to verify onboarding token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Check tenants
    const matchedTenant = await db.select().from(tenants).where(eq(tenants.onboardingToken, token));
    if (matchedTenant.length > 0) {
      const tenant = matchedTenant[0];
      if (tenant.onboardingTokenExpiresAt && new Date(tenant.onboardingTokenExpiresAt) < new Date()) {
        return NextResponse.json({ error: 'This onboarding link has expired' }, { status: 410 });
      }

      const updated = await db.update(tenants).set({
        passwordHash,
        onboardingCompleted: true,
        onboardingToken: null,
        onboardingTokenExpiresAt: null,
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenant.id)).returning();

      const updatedTenant = updated[0];
      const sessionUser = {
        id: updatedTenant.id,
        email: updatedTenant.email,
        name: updatedTenant.fullName,
        role: 'tenant' as const,
      };

      const res = NextResponse.json({
        success: true,
        message: 'Password set successfully! Your resident account is now active.',
        tenant: {
          id: updatedTenant.id,
          fullName: updatedTenant.fullName,
          email: updatedTenant.email,
          roomNumber: updatedTenant.roomNumber,
        },
        user: sessionUser,
      });

      await setAuthCookies(res, sessionUser);
      return res;
    }

    // Check users/admins
    const matchedUser = await db.select().from(users).where(eq(users.onboardingToken, token));
    if (matchedUser.length > 0) {
      const user = matchedUser[0];
      if (user.onboardingTokenExpiresAt && new Date(user.onboardingTokenExpiresAt) < new Date()) {
        return NextResponse.json({ error: 'This onboarding link has expired' }, { status: 410 });
      }

      const updated = await db.update(users).set({
        passwordHash,
        status: 'active',
        onboardingToken: null,
        onboardingTokenExpiresAt: null,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id)).returning();

      const updatedUser = updated[0];
      const sessionUser = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.fullName,
        role: updatedUser.role as any,
      };

      const res = NextResponse.json({
        success: true,
        message: 'Password set successfully! Your admin account is now active.',
        tenant: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
        },
        user: sessionUser,
      });

      await setAuthCookies(res, sessionUser);
      return res;
    }

    return NextResponse.json({ error: 'Invalid or expired onboarding token' }, { status: 404 });
  } catch (error: any) {
    console.error('Failed to complete onboarding setup:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
