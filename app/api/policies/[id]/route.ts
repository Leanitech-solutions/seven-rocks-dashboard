import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { policies } from '../../../../server/schema';
import { eq } from 'drizzle-orm';
import { parseSessionCookie, SESSION_COOKIE_NAME } from '../../../../lib/auth';
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

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    const data = await req.json();
    const res = await db.update(policies).set(data).where(eq(policies.id, id)).returning();
    return NextResponse.json(res[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    await db.delete(policies).where(eq(policies.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
