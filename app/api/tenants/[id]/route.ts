import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { eq } from 'drizzle-orm';
import { tenants } from '../../../../server/schema';

import { parseSessionCookie, SESSION_COOKIE_NAME } from '../../../../lib/auth';
import { cookies } from 'next/headers';

const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

async function checkAdmin(req: Request) {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await parseSessionCookie(sessionVal);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return false;
  }
  return true;
}

async function handleSaveTenant(id: string, data: any) {
  delete data.id;

  let updated: any[] = [];

  // 1. Try updating by valid UUID
  if (isUUID(id)) {
    updated = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
  }

  // 2. If not matched by UUID, match by email
  if (updated.length === 0 && data.email) {
    const cleanEmail = data.email.trim().toLowerCase();
    updated = await db
      .update(tenants)
      .set({ ...data, email: cleanEmail, updatedAt: new Date() })
      .where(eq(tenants.email, cleanEmail))
      .returning();
  }

  // 3. If tenant record does not exist in Postgres yet, insert it!
  if (updated.length === 0) {
    if (!data.fullName && data.name) {
      data.fullName = data.name;
    }
    if (!data.fullName) {
      data.fullName = 'Resident';
    }
    if (!data.email) {
      throw new Error('Email is required to save tenant record');
    }
    data.email = data.email.trim().toLowerCase();
    data.userId = data.userId || `user-${Date.now()}`;

    updated = await db.insert(tenants).values(data).returning();
  }

  return updated[0];
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const data = await req.json();
    const result = await handleSaveTenant(id, data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to update tenant:', error);
    return NextResponse.json({ error: error.message || 'Failed to update tenant' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const data = await req.json();
    const result = await handleSaveTenant(id, data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to update tenant:', error);
    return NextResponse.json({ error: error.message || 'Failed to update tenant' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await checkAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    if (isUUID(id)) {
      await db.delete(tenants).where(eq(tenants.id, id));
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
