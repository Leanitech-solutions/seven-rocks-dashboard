import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { addOnServices } from '../../../server/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  const a = await db.select().from(addOnServices).orderBy(desc(addOnServices.createdAt));
  return NextResponse.json(a);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await db.insert(addOnServices).values({
      name: body.name,
      description: body.description || '',
      price: String(body.price || body.priceVal || '0'),
      priceLabel: body.priceLabel || body.price || '',
      type: body.type || 'Subscription',
      category: body.category || 'other',
      iconName: body.iconName || 'Sparkles',
      badge: body.badge || null,
      options: body.options || [],
    }).returning();
    return NextResponse.json(res[0]);
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
