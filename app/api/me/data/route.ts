import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, parseSessionCookie } from '../../../../lib/auth';
import { db } from '../../../../server/db';
import {
  tenants,
  addOnRequests,
  addOnServices,
  housekeepingRequests,
  maintenanceTickets,
  invoices,
  notifications,
  contractExtensionRequests,
} from '../../../../server/schema';
import { eq, or, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await parseSessionCookie(sessionVal);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the tenant row
    const tenantRows = await db.select().from(tenants).where(
      or(eq(tenants.userId, session.id), eq(tenants.email, session.email))
    ).limit(1);

    if (tenantRows.length === 0) {
      return NextResponse.json({
        addOnRequests: [], housekeepings: [], tickets: [], invoices: [],
        notifications: [], extensionRequests: [], catalogItems: [],
      });
    }

    const tenant = tenantRows[0];
    const tenantId = tenant.id;

    // Fetch all tenant-specific data in parallel
    const [reqRows, hkRows, ticketRows, invoiceRows, notifRows, extRows, catalogRows] = await Promise.all([
      db.select({
        id: addOnRequests.id,
        tenantId: addOnRequests.tenantId,
        serviceId: addOnRequests.serviceId,
        serviceName: addOnServices.name,
        priceValue: addOnServices.price,
        priceDetails: addOnServices.description,
        category: addOnServices.category,
        status: addOnRequests.status,
        paymentStatus: addOnRequests.paymentStatus,
        requestDate: addOnRequests.createdAt,
      })
        .from(addOnRequests)
        .leftJoin(addOnServices, eq(addOnRequests.serviceId, addOnServices.id))
        .where(eq(addOnRequests.tenantId, tenantId))
        .orderBy(desc(addOnRequests.createdAt)),

      db.select().from(housekeepingRequests).where(eq(housekeepingRequests.tenantId, tenantId)).orderBy(desc(housekeepingRequests.createdAt)),
      db.select().from(maintenanceTickets).where(eq(maintenanceTickets.tenantId, tenantId)).orderBy(desc(maintenanceTickets.createdAt)),
      db.select().from(invoices).where(eq(invoices.tenantId, tenantId)).orderBy(desc(invoices.createdAt)),
      db.select().from(notifications).orderBy(desc(notifications.sentAt)),
      db.select().from(contractExtensionRequests).where(eq(contractExtensionRequests.tenantId, tenantId)).orderBy(desc(contractExtensionRequests.requestDate)),
      db.select().from(addOnServices).orderBy(desc(addOnServices.createdAt)),
    ]);

    return NextResponse.json({
      addOnRequests: reqRows.map(r => ({
        id: r.id,
        tenantId: r.tenantId,
        serviceId: r.serviceId,
        tenantName: tenant.fullName,
        roomNumber: tenant.roomNumber || '',
        building: tenant.propertyLocation || '',
        serviceName: r.serviceName || 'Unknown',
        priceDetails: r.priceDetails || '',
        priceValue: Number(r.priceValue) || 0,
        category: 'Other',
        requestDate: r.requestDate ? new Date(r.requestDate).toISOString().split('T')[0] : '',
        status: r.status || 'Pending',
        paymentStatus: r.paymentStatus || 'Unpaid',
      })),
      housekeepings: hkRows.map(h => ({
        id: h.id,
        tenantId: h.tenantId,
        tenantName: tenant.fullName,
        roomNumber: tenant.roomNumber || '',
        building: tenant.propertyLocation || '',
        scheduleDate: h.date,
        requestedAt: h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : '',
        frequency: h.frequency || 'Single Use',
        priceValue: Number(h.priceValue) || 40,
        status: h.status,
        notes: h.specialInstructions,
      })),
      tickets: ticketRows.map(t => ({
        id: t.id,
        tenantId: t.tenantId,
        tenantName: tenant.fullName,
        roomNumber: tenant.roomNumber || '',
        building: tenant.propertyLocation || '',
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '',
        category: 'Maintenance',
      })),
      invoices: invoiceRows.map(i => ({
        id: i.id,
        tenantId: i.tenantId,
        tenantName: tenant.fullName,
        roomNumber: tenant.roomNumber || '',
        building: tenant.propertyLocation || '',
        date: i.createdAt ? new Date(i.createdAt).toISOString().split('T')[0] : '',
        dueDate: i.dueDate,
        rentAmount: Number(i.rentAmount) || 0,
        extraPersonSurcharge: Number(i.extraPersonSurcharge) || 0,
        addOnTotal: Number(i.addOnTotal) || 0,
        adminFee: Number(i.adminFee) || 0,
        depositAmount: Number(i.depositAmount) || 0,
        subtotal: Number(i.subtotal) || 0,
        vatRate: Number(i.vatRate) || 10,
        vatAmount: Number(i.vatAmount) || 0,
        totalAmount: Number(i.amount) || 0,
        status: i.status || 'Pending',
        paymentMethod: i.paymentMethod || '',
        paymentDate: i.paymentDate || '',
        type: i.type,
        description: i.description,
      })),
      notifications: notifRows.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        targetAudience: n.targetAudience,
        targetValue: n.targetValue,
        sentAt: n.sentAt ? new Date(n.sentAt).toISOString() : '',
        readCount: n.readCount || 0,
        deliveredCount: n.deliveredCount || 0,
      })),
      extensionRequests: extRows.map(e => ({
        id: e.id,
        tenantId: e.tenantId,
        tenantName: tenant.fullName,
        roomNumber: tenant.roomNumber || '',
        building: tenant.propertyLocation || '',
        currentEndDate: e.currentEndDate,
        requestedDurationMonths: e.requestedDurationMonths,
        newEndDate: e.newEndDate,
        requestDate: e.requestDate ? new Date(e.requestDate).toISOString().split('T')[0] : '',
        status: e.status || 'Pending',
        notes: e.notes,
      })),
      catalogItems: catalogRows.map(c => ({
        id: c.id,
        name: c.name,
        desc: c.description || '',
        price: c.priceLabel || `€${c.price}`,
        priceVal: Number(c.price) || 0,
        category: c.category || 'other',
        iconName: c.iconName || 'Sparkles',
        badge: c.badge || undefined,
        options: Array.isArray(c.options) ? c.options : [],
      })),
    });
  } catch (error: any) {
    console.error('Error fetching tenant data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
