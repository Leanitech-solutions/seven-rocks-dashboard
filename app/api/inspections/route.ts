import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { inspections } from '../../../server/schema';

export async function POST(req: Request) {
  const data = await req.json();
  const res = await db.insert(inspections).values(data).returning();
  return NextResponse.json(res[0]);
}
