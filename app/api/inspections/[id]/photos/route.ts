import { NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { inventoryPhotos } from '../../../../../server/schema';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await req.json();
  const res = await db.insert(inventoryPhotos).values({ inspectionId: id, ...data }).returning();
  return NextResponse.json(res[0]);
}
