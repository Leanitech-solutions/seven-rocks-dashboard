import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { eq } from 'drizzle-orm';
import { invoices } from '../../../../server/schema';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 });
    }
    const data = await req.json();

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.paymentMethod !== undefined) updatePayload.paymentMethod = data.paymentMethod;
    if (data.paymentDate !== undefined) updatePayload.paymentDate = data.paymentDate;
    if (data.paymentChannel !== undefined) updatePayload.paymentChannel = data.paymentChannel;
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.amount !== undefined) updatePayload.amount = String(data.amount);

    const res = await db.update(invoices).set(updatePayload).where(eq(invoices.id, id)).returning();
    if (!res || res.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json(res[0]);
  } catch (error: any) {
    console.error('Invoice update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 });
    }
    const res = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    if (!res || res.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted: res[0] });
  } catch (error: any) {
    console.error('Invoice deletion error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
