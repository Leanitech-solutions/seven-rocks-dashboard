import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { maintenanceTickets } from '../../../server/schema';

export async function GET() {
  const t = await db.select().from(maintenanceTickets);
  return NextResponse.json(t);
}
export async function POST(req: Request) {
  const data = await req.json();
  const res = await db.insert(maintenanceTickets).values(data).returning();
  return NextResponse.json(res[0]);
}
