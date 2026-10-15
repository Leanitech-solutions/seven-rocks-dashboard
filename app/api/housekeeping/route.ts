import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { housekeepingRequests } from '../../../server/schema';

export async function GET() {
  const h = await db.select().from(housekeepingRequests);
  return NextResponse.json(h);
}
export async function POST(req: Request) {
  const data = await req.json();
  const res = await db.insert(housekeepingRequests).values(data).returning();
  return NextResponse.json(res[0]);
}
