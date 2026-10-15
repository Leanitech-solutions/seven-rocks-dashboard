import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { eq } from 'drizzle-orm';
import { users, tenants } from '../../../server/schema';
import bcrypt from 'bcryptjs';
import { setAuthCookies, AuthSession } from '../../../lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    let sessionUser: AuthSession | null = null;

    if (role === 'admin') {
      const u = await db.select().from(users).where(eq(users.email, cleanEmail));
      let isMatch = false;
      if (u.length > 0 && u[0].passwordHash && u[0].status === 'active') {
        try {
          isMatch = await bcrypt.compare(password, u[0].passwordHash);
        } catch {}
      }
      
      if (isMatch && u.length > 0) {
        sessionUser = {
          id: u[0].id,
          email: u[0].email,
          name: u[0].fullName,
          role: u[0].role as 'admin' | 'super_admin' | 'tenant',
          department: (Array.isArray(u[0].department) ? u[0].department : []) as string[],
        };
      }

    } else {
      const t = await db.select().from(tenants).where(eq(tenants.email, cleanEmail));
      if (t.length > 0 && t[0].passwordHash && await bcrypt.compare(password, t[0].passwordHash)) {
        sessionUser = {
          id: t[0].id,
          email: t[0].email,
          name: t[0].fullName,
          role: 'tenant',
        };
      }
    }

    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid security credentials or email' }, { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      message: 'Login successful',
      role: sessionUser.role,
      user: sessionUser,
    });

    // Attach HttpOnly cookie & client user cookie
    await setAuthCookies(res, sessionUser);

    return res;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}
