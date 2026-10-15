import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { users } from '../../../../server/schema';
import { eq } from 'drizzle-orm';
import { parseSessionCookie, SESSION_COOKIE_NAME } from '../../../../lib/auth';
import { cookies } from 'next/headers';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await parseSessionCookie(sessionVal);

    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can update admin details' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = { updatedAt: new Date() };

    if (body.department !== undefined) {
      updateData.department = body.department;
    }
    if (body.fullName) {
      updateData.fullName = body.fullName;
    }

    await db.update(users).set(updateData).where(eq(users.id, id));

    const updated = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      status: users.status,
      department: users.department,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, id));

    if (!updated.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await parseSessionCookie(sessionVal);

    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can delete admins' }, { status: 403 });
    }

    if (session.id === id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
