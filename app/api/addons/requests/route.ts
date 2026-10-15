import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { addOnRequests } from '../../../../server/schema';

export async function GET() {
  const a = await db.select().from(addOnRequests);
  return NextResponse.json(a);
}
export async function POST(req: Request) {
  const data = await req.json();
  const res = await db.insert(addOnRequests).values(data).returning();
  return NextResponse.json(res[0]);
}
