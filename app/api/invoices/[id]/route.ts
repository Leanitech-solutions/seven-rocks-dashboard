import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { eq } from 'drizzle-orm';
import { invoices } from '../../../../server/schema';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const res = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
  return NextResponse.json(res[0]);
}
