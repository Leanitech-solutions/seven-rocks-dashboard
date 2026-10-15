import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { addOnRequests, addOnServices, tenants } from '../../../../server/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, paymentStatus } = body;

    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    await db.update(addOnRequests)
      .set(updateData)
      .where(eq(addOnRequests.id, id));

    // Return updated row with joins
    const data = await db
      .select({
        id: addOnRequests.id,
        tenantId: addOnRequests.tenantId,
        tenantName: tenants.fullName,
        roomNumber: tenants.roomNumber,
        serviceId: addOnRequests.serviceId,
        serviceName: addOnServices.name,
        priceValue: addOnServices.price,
        priceDetails: addOnServices.description,
        status: addOnRequests.status,
        paymentStatus: addOnRequests.paymentStatus,
        requestDate: addOnRequests.createdAt,
      })
      .from(addOnRequests)
      .leftJoin(tenants, eq(addOnRequests.tenantId, tenants.id))
      .leftJoin(addOnServices, eq(addOnRequests.serviceId, addOnServices.id))
      .where(eq(addOnRequests.id, id));

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Error updating add-on request:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(addOnRequests).where(eq(addOnRequests.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting add-on request:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
