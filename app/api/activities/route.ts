import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { activityLogs } from '../../../server/schema';
import { desc } from 'drizzle-orm';

import { parseSessionCookie, SESSION_COOKIE_NAME } from '../../../lib/auth';
import { cookies } from 'next/headers';

async function checkAdmin() {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await parseSessionCookie(sessionVal);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return false;
  }
  return true;
}

export async function GET() {
  try {
    if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const logs = await db.select().from(activityLogs).orderBy(desc(activityLogs.timestamp));
    return NextResponse.json(logs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const data = await req.json();
    const res = await db.insert(activityLogs).values(data).returning();
    return NextResponse.json(res[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
