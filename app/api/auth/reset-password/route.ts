import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { tenants, users, activityLogs } from '../../../../server/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { setAuthCookies, AuthSession } from '../../../../lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Password reset token is required' }, { status: 400 });
    }

    // 1. Check tenants
    const matchedTenants = await db.select().from(tenants).where(eq(tenants.resetPasswordToken, token));
    if (matchedTenants.length > 0) {
      const tenant = matchedTenants[0];
      if (tenant.resetPasswordTokenExpiresAt && new Date(tenant.resetPasswordTokenExpiresAt) < new Date()) {
        return NextResponse.json({ error: 'This password reset link has expired. Please request a new link.' }, { status: 410 });
      }
      return NextResponse.json({
        valid: true,
        type: 'tenant',
        user: {
          id: tenant.id,
          fullName: tenant.fullName,
          email: tenant.email,
        },
      });
    }

    // 2. Check users/staff
    const matchedUsers = await db.select().from(users).where(eq(users.resetPasswordToken, token));
    if (matchedUsers.length > 0) {
      const user = matchedUsers[0];
      if (user.resetPasswordTokenExpiresAt && new Date(user.resetPasswordTokenExpiresAt) < new Date()) {
        return NextResponse.json({ error: 'This password reset link has expired. Please request a new link.' }, { status: 410 });
      }
      return NextResponse.json({
        valid: true,
        type: 'admin',
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid or already used password reset link.' }, { status: 404 });
  } catch (error: any) {
    console.error('Failed to verify reset password token:', error);
    return NextResponse.json({ error: error.message || 'Token verification failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Check tenants
    const matchedTenants = await db.select().from(tenants).where(eq(tenants.resetPasswordToken, token));
    if (matchedTenants.length > 0) {
      const tenant = matchedTenants[0];
      if (tenant.resetPasswordTokenExpiresAt && new Date(tenant.resetPasswordTokenExpiresAt) < new Date()) {
        return NextResponse.json({ error: 'This password reset link has expired. Please request a new link.' }, { status: 410 });
      }

      await db.update(tenants).set({
        passwordHash,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenant.id));

      try {
        await db.insert(activityLogs).values({
          type: 'tenant',
          user: tenant.email,
          action: 'Password Changed',
          details: `Resident ${tenant.fullName} successfully updated their password via reset link.`,
        });
      } catch {}

      const sessionUser: AuthSession = {
        id: tenant.id,
        email: tenant.email,
        name: tenant.fullName,
        role: 'tenant',
      };

      const res = NextResponse.json({
        success: true,
        message: 'Password has been updated successfully.',
        role: 'tenant',
        user: sessionUser,
      });

      await setAuthCookies(res, sessionUser);
      return res;
    }

    // 2. Check users/staff
    const matchedUsers = await db.select().from(users).where(eq(users.resetPasswordToken, token));
    if (matchedUsers.length > 0) {
      const user = matchedUsers[0];
      if (user.resetPasswordTokenExpiresAt && new Date(user.resetPasswordTokenExpiresAt) < new Date()) {
        return NextResponse.json({ error: 'This password reset link has expired. Please request a new link.' }, { status: 410 });
      }

      await db.update(users).set({
        passwordHash,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      try {
        await db.insert(activityLogs).values({
          type: 'tenant',
          user: user.email,
          action: 'Password Changed',
          details: `Staff member ${user.fullName} successfully updated their password via reset link.`,
        });
      } catch {}

      const sessionUser: AuthSession = {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role as any,
        department: (Array.isArray(user.department) ? user.department : []) as string[],
      };

      const res = NextResponse.json({
        success: true,
        message: 'Password has been updated successfully.',
        role: user.role,
        user: sessionUser,
      });

      await setAuthCookies(res, sessionUser);
      return res;
    }

    return NextResponse.json({ error: 'Invalid or expired password reset link.' }, { status: 404 });
  } catch (error: any) {
    console.error('Password reset update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update password.' }, { status: 500 });
  }
}
