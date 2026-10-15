import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { users } from '../../../server/schema';
import { eq, or } from 'drizzle-orm';
import { parseSessionCookie, SESSION_COOKIE_NAME } from '../../../lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await parseSessionCookie(sessionVal);

    if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allAdmins = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      status: users.status,
      department: users.department,
      createdAt: users.createdAt,
    }).from(users).where(or(eq(users.role, 'admin'), eq(users.role, 'super_admin')));

    return NextResponse.json(allAdmins);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
