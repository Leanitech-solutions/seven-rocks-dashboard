import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { addOnRequests, addOnServices, tenants } from '../../../server/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const data = await db
      .select({
        id: addOnRequests.id,
        tenantId: addOnRequests.tenantId,
        tenantName: tenants.fullName,
        roomNumber: tenants.roomNumber,
        serviceId: addOnRequests.serviceId,
        serviceName: addOnServices.name,
        category: addOnServices.type,
        requestDate: addOnRequests.createdAt,
        priceValue: addOnServices.price,
        priceDetails: addOnServices.description,
        status: addOnRequests.status,
        paymentStatus: addOnRequests.paymentStatus,
      })
      .from(addOnRequests)
      .leftJoin(tenants, eq(addOnRequests.tenantId, tenants.id))
      .leftJoin(addOnServices, eq(addOnRequests.serviceId, addOnServices.id))
      .orderBy(desc(addOnRequests.createdAt));
      
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching add-on requests:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await db.insert(addOnRequests).values({
      tenantId: body.tenantId,
      serviceId: body.serviceId,
      status: 'Pending',
      paymentStatus: 'Unpaid',
    }).returning();
    
    // Fetch the joined data to return to the client
    const data = await db
      .select({
        id: addOnRequests.id,
        tenantId: addOnRequests.tenantId,
        tenantName: tenants.fullName,
        roomNumber: tenants.roomNumber,
        serviceId: addOnRequests.serviceId,
        serviceName: addOnServices.name,
        category: addOnServices.type,
        requestDate: addOnRequests.createdAt,
        priceValue: addOnServices.price,
        priceDetails: addOnServices.description,
        status: addOnRequests.status,
        paymentStatus: addOnRequests.paymentStatus,
      })
      .from(addOnRequests)
      .leftJoin(tenants, eq(addOnRequests.tenantId, tenants.id))
      .leftJoin(addOnServices, eq(addOnRequests.serviceId, addOnServices.id))
      .where(eq(addOnRequests.id, res[0].id));

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Error creating add-on request:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
