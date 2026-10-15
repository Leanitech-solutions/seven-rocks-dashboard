import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { addOnServices } from '../../../../server/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await db.update(addOnServices)
      .set({
        name: body.name,
        description: body.description,
        price: body.price,
        priceLabel: body.priceLabel,
        type: body.type,
        category: body.category,
        iconName: body.iconName,
        badge: body.badge || null,
        options: body.options || [],
        updatedAt: new Date(),
      })
      .where(eq(addOnServices.id, id))
      .returning();
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(addOnServices).where(eq(addOnServices.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
