import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { appSettings } from '../../../server/schema';
import { eq } from 'drizzle-orm';

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
    const allSettings = await db.select().from(appSettings);
    // Return first row as singleton, or empty object
    return NextResponse.json(allSettings.length > 0 ? allSettings[0] : {});
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const data = await req.json();
    const existing = await db.select().from(appSettings);
    let res;
    if (existing.length === 0) {
      res = await db.insert(appSettings).values(data).returning();
    } else {
      res = await db.update(appSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(appSettings.id, existing[0].id))
        .returning();
    }
    return NextResponse.json(res[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
