import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { housekeepingRequests, tenants } from '../../../../server/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, scheduleDate, frequency, priceValue } = body;

    const updateData: any = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (scheduleDate) updateData.date = scheduleDate;
    if (frequency) updateData.frequency = frequency;
    if (priceValue !== undefined) updateData.priceValue = priceValue;

    await db.update(housekeepingRequests)
      .set(updateData)
      .where(eq(housekeepingRequests.id, id));

    const updated = await db
      .select({
        id: housekeepingRequests.id,
        tenantId: housekeepingRequests.tenantId,
        tenantName: tenants.fullName,
        roomNumber: tenants.roomNumber,
        building: tenants.propertyLocation,
        scheduleDate: housekeepingRequests.date,
        requestedAt: housekeepingRequests.createdAt,
        frequency: housekeepingRequests.frequency,
        priceValue: housekeepingRequests.priceValue,
        status: housekeepingRequests.status,
        notes: housekeepingRequests.specialInstructions,
      })
      .from(housekeepingRequests)
      .leftJoin(tenants, eq(housekeepingRequests.tenantId, tenants.id))
      .where(eq(housekeepingRequests.id, id));

    if (!updated.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const row = updated[0];
    return NextResponse.json({
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenantName || 'Resident',
      roomNumber: row.roomNumber || 'Unknown',
      building: row.building || 'Unknown',
      scheduleDate: row.scheduleDate,
      requestedAt: row.requestedAt ? new Date(row.requestedAt).toISOString().split('T')[0] : row.scheduleDate,
      frequency: row.frequency || 'Single Use',
      priceValue: Number(row.priceValue) || 40,
      status: row.status,
      notes: row.notes,
    });
  } catch (error) {
    console.error('Error updating housekeeping:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(housekeepingRequests).where(eq(housekeepingRequests.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting housekeeping:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
