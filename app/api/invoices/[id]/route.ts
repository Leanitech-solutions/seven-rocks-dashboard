import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { eq, or, and, ilike } from 'drizzle-orm';
import { invoices, tenants, activityLogs } from '../../../../server/schema';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, parseSessionCookie } from '../../../../lib/auth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paramId } = await params;
    if (!paramId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }
    const rawId = decodeURIComponent(paramId).trim();
    let data: any = {};
    try {
      data = await req.json();
    } catch {}

    // Determine requesting session
    let sessionUser: any = null;
    let currentTenant: any = null;
    try {
      const cookieStore = await cookies();
      const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      sessionUser = await parseSessionCookie(sessionVal);
      if (sessionUser && sessionUser.role === 'tenant') {
        const t = await db.select().from(tenants).where(
          or(eq(tenants.userId, sessionUser.id), eq(tenants.email, sessionUser.email))
        ).limit(1);
        if (t.length > 0) currentTenant = t[0];
      }
    } catch {}

    // 1. Locate existing invoice
    let targetInvoice: any = null;

    if (currentTenant) {
      // Scoped to current tenant
      if (UUID_REGEX.test(rawId)) {
        const found = await db.select().from(invoices).where(
          and(eq(invoices.id, rawId), eq(invoices.tenantId, currentTenant.id))
        ).limit(1);
        if (found.length > 0) targetInvoice = found[0];
      }
      if (!targetInvoice) {
        const found = await db.select().from(invoices).where(
          and(
            eq(invoices.tenantId, currentTenant.id),
            or(
              ilike(invoices.notes, `%${rawId}%`),
              ilike(invoices.description, `%${rawId}%`)
            )
          )
        ).limit(1);
        if (found.length > 0) targetInvoice = found[0];
      }
    } else {
      // Admin / staff lookup
      if (UUID_REGEX.test(rawId)) {
        const found = await db.select().from(invoices).where(eq(invoices.id, rawId)).limit(1);
        if (found.length > 0) targetInvoice = found[0];
      }
      if (!targetInvoice) {
        const found = await db.select().from(invoices).where(
          or(
            ilike(invoices.notes, `%${rawId}%`),
            ilike(invoices.description, `%${rawId}%`)
          )
        ).limit(1);
        if (found.length > 0) targetInvoice = found[0];
      }
    }

    // 2. If not found in invoices table, synthesize and persist for the tenant
    if (!targetInvoice) {
      let targetTenant: any = currentTenant;

      if (!targetTenant && data.tenantId && UUID_REGEX.test(data.tenantId)) {
        const t = await db.select().from(tenants).where(eq(tenants.id, data.tenantId)).limit(1);
        if (t.length > 0) targetTenant = t[0];
      }

      if (!targetTenant) {
        const allTenants = await db.select().from(tenants);
        targetTenant = allTenants.find(t =>
          (t.contractUrl && t.contractUrl.includes(rawId)) ||
          (Array.isArray(t.additionalDocs) && JSON.stringify(t.additionalDocs).includes(rawId))
        ) || null;
      }

      if (targetTenant) {
        const rent = Number(targetTenant.rentAmount) || 1200;
        const vat = Math.round(rent * 0.10 * 100) / 100;
        const total = rent + vat;

        const inserted = await db.insert(invoices).values({
          tenantId: targetTenant.id,
          amount: String(data.amount ?? total),
          status: data.status || 'Desk Payment Requested',
          dueDate: targetTenant.leaseEnd ? String(targetTenant.leaseEnd) : new Date().toISOString().split('T')[0],
          type: 'Standard Invoice',
          description: 'Monthly Serviced Residence Fee',
          rentAmount: String(rent),
          extraPersonSurcharge: '0',
          addOnTotal: '0',
          adminFee: '0',
          depositAmount: '0',
          subtotal: String(rent),
          vatRate: '10',
          vatAmount: String(vat),
          paymentMethod: data.paymentMethod || null,
          paymentDate: data.paymentDate || null,
          paymentChannel: data.paymentChannel || 'Desk',
          notes: `Invoice No: ${rawId}`,
        }).returning();

        if (inserted.length > 0) {
          targetInvoice = inserted[0];
        }
      }
    }

    if (!targetInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 3. Apply updates
    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.paymentMethod !== undefined) updatePayload.paymentMethod = data.paymentMethod;
    if (data.paymentDate !== undefined) updatePayload.paymentDate = data.paymentDate;
    if (data.paymentChannel !== undefined) updatePayload.paymentChannel = data.paymentChannel;
    if (data.notes !== undefined) {
      const existingNotes = targetInvoice.notes || '';
      const invNoMatch = existingNotes.match(/Invoice\s*(?:No\.?|#)?\s*:?\s*([A-Za-z0-9-]+)/i);
      if (invNoMatch && !data.notes.includes(invNoMatch[0])) {
        updatePayload.notes = `${invNoMatch[0]} | ${data.notes}`;
      } else {
        updatePayload.notes = data.notes;
      }
    }
    if (data.amount !== undefined) updatePayload.amount = String(data.amount);

    const res = await db.update(invoices).set(updatePayload).where(eq(invoices.id, targetInvoice.id)).returning();
    if (!res || res.length === 0) {
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    const updated = res[0];
    const invoiceLabel = rawId || updated.id.slice(0, 8);

    // 4. Activity logging
    try {
      let residentName = 'Resident';
      if (updated.tenantId) {
        const t = await db.select({ fullName: tenants.fullName }).from(tenants).where(eq(tenants.id, updated.tenantId));
        if (t.length > 0 && t[0].fullName) residentName = t[0].fullName;
      }

      if (data.status === 'Desk Payment Requested') {
        await db.insert(activityLogs).values({
          type: 'billing',
          user: residentName,
          action: 'Desk Settlement Requested',
          details: `${residentName} submitted a front desk settlement request for Invoice #${invoiceLabel} (€${updated.amount}). Staff confirmation required at reception desk.`,
        });
      } else if (data.status === 'Paid') {
        await db.insert(activityLogs).values({
          type: 'billing',
          user: 'Front Desk Staff',
          action: 'Invoice Confirmed Paid',
          details: `Invoice #${invoiceLabel} (€${updated.amount}) for ${residentName} verified and confirmed as PAID via ${data.paymentMethod || 'Desk Terminal'}.`,
        });
      }
    } catch (e) {
      console.error('Failed to log billing activity:', e);
    }

    return NextResponse.json({ ...updated, invoiceNumber: invoiceLabel });
  } catch (error: any) {
    console.error('Invoice update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paramId } = await params;
    if (!paramId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }
    const rawId = decodeURIComponent(paramId).trim();

    let res: any[] = [];
    if (UUID_REGEX.test(rawId)) {
      res = await db.delete(invoices).where(eq(invoices.id, rawId)).returning();
    } else {
      res = await db.delete(invoices).where(
        or(
          ilike(invoices.notes, `%${rawId}%`),
          ilike(invoices.description, `%${rawId}%`)
        )
      ).returning();
    }

    if (!res || res.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted: res[0] });
  } catch (error: any) {
    console.error('Invoice deletion error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
