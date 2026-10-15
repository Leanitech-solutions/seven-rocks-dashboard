import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, parseSessionCookie } from '../../../lib/auth';
import { db } from '../../../server/db';
import { users } from '../../../server/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await parseSessionCookie(sessionVal);

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // For admin/super_admin, fetch fresh department from DB
    let department = session.department || [];
    if (session.role === 'admin' || session.role === 'super_admin') {
      try {
        const rows = await db.select({ department: users.department }).from(users).where(eq(users.id, session.id)).limit(1);
        if (rows.length > 0 && Array.isArray(rows[0].department)) {
          department = rows[0].department as string[];
        }
      } catch {}
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        ...session,
        department,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
