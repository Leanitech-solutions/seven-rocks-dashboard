import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { invoices, tenants } from '../../../server/schema';
import { eq } from 'drizzle-orm';
import { sendInvoiceNotificationEmail } from '../../../lib/email';
import { formatId } from '../../../lib/formatId';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(val: any): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

export async function GET() {
  try {
    const rows = await db
      .select({
        id: invoices.id,
        tenantId: invoices.tenantId,
        amount: invoices.amount,
        status: invoices.status,
        dueDate: invoices.dueDate,
        type: invoices.type,
        description: invoices.description,
        rentAmount: invoices.rentAmount,
        extraPersonSurcharge: invoices.extraPersonSurcharge,
        addOnTotal: invoices.addOnTotal,
        adminFee: invoices.adminFee,
        depositAmount: invoices.depositAmount,
        subtotal: invoices.subtotal,
        vatRate: invoices.vatRate,
        vatAmount: invoices.vatAmount,
        paymentMethod: invoices.paymentMethod,
        paymentDate: invoices.paymentDate,
        paymentChannel: invoices.paymentChannel,
        notes: invoices.notes,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
        tenantName: tenants.fullName,
        roomNumber: tenants.roomNumber,
        building: tenants.propertyLocation,
      })
      .from(invoices)
      .leftJoin(tenants, eq(invoices.tenantId, tenants.id));

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Invoice fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // 1. Identify human-readable invoice number if provided as non-UUID id or invoiceNumber
    const customInvoiceNumber = data.invoiceNumber || (data.id && !isValidUUID(data.id) ? String(data.id).trim() : null);

    // 2. Format notes, appending invoice number if applicable
    let finalNotes: string | null = null;
    if (customInvoiceNumber) {
      if (data.notes && String(data.notes).trim()) {
        const existingNotes = String(data.notes).trim();
        finalNotes = existingNotes.includes(customInvoiceNumber)
          ? existingNotes
          : `Invoice No: ${customInvoiceNumber} | ${existingNotes}`;
      } else {
        finalNotes = `Invoice No: ${customInvoiceNumber}`;
      }
    } else if (data.notes && String(data.notes).trim()) {
      finalNotes = String(data.notes).trim();
    }

    // 3. Validate tenantId (must be a valid UUID and must exist in tenants table)
    let validTenantId: string | null = null;
    if (isValidUUID(data.tenantId)) {
      const existingTenant = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, data.tenantId.trim()))
        .limit(1);
      if (existingTenant.length > 0) {
        validTenantId = existingTenant[0].id;
      }
    }

    // 4. Resolve amount (numeric NOT NULL in PostgreSQL schema)
    const rawAmount = data.amount ?? data.totalAmount ?? data.rentAmount ?? 0;
    const parsedAmount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]/g, '')) || 0;
    const amountStr = parsedAmount.toFixed(2);

    // 5. Resolve required and breakdown fields
    const dueDate = data.dueDate || data.date || new Date().toISOString().split('T')[0];
    const type = data.type || 'Standard Invoice';
    const status = data.status || 'Pending';
    const description = data.description || (customInvoiceNumber ? `Invoice ${customInvoiceNumber}` : null);

    const rentAmountStr = data.rentAmount !== undefined ? String(data.rentAmount) : null;
    const extraPersonSurchargeStr = String(data.extraPersonSurcharge ?? 0);
    const addOnTotalStr = String(data.addOnTotal ?? 0);
    const adminFeeStr = String(data.adminFee ?? 0);
    const depositAmountStr = String(data.depositAmount ?? 0);
    const subtotalStr = data.subtotal !== undefined ? String(data.subtotal) : amountStr;
    const vatRateStr = String(data.vatRate ?? 10);
    const vatAmountStr = data.vatAmount !== undefined ? String(data.vatAmount) : null;

    // 6. Build clean insert payload containing strictly valid schema columns
    const insertPayload: any = {
      tenantId: validTenantId,
      amount: amountStr,
      status,
      dueDate,
      type,
      description,
      rentAmount: rentAmountStr,
      extraPersonSurcharge: extraPersonSurchargeStr,
      addOnTotal: addOnTotalStr,
      adminFee: adminFeeStr,
      depositAmount: depositAmountStr,
      subtotal: subtotalStr,
      vatRate: vatRateStr,
      vatAmount: vatAmountStr,
      paymentMethod: data.paymentMethod || null,
      paymentDate: data.paymentDate || null,
      paymentChannel: data.paymentChannel || null,
      notes: finalNotes,
    };

    // If a valid UUID was explicitly supplied for id, use it; otherwise PostgreSQL defaultRandom() will generate one
    if (isValidUUID(data.id)) {
      insertPayload.id = data.id.trim();
    }

    const res = await db.insert(invoices).values(insertPayload).returning();
    const newInvoice = res[0];

    // 7. Send tenant email notification if tenant exists
    if (newInvoice && newInvoice.tenantId) {
      try {
        const tenantRes = await db.select().from(tenants).where(eq(tenants.id, newInvoice.tenantId));
        if (tenantRes.length > 0) {
          const tenant = tenantRes[0];
          const hostHeader = req.headers.get('host') || 'localhost:3000';
          const protocol = req.headers.get('x-forwarded-proto') || 'http';
          const origin = req.headers.get('origin') || `${protocol}://${hostHeader}`;

          await sendInvoiceNotificationEmail({
            toEmail: tenant.email,
            tenantName: tenant.fullName,
            invoiceId: customInvoiceNumber || formatId(newInvoice.id),
            amount: newInvoice.amount,
            dueDate: newInvoice.dueDate,
            description: newInvoice.description || undefined,
            portalUrl: `${origin}/portal`,
          }).catch(err => {
            console.error('Failed to send invoice email:', err);
          });
        }
      } catch (emailErr) {
        console.error('Email dispatch error:', emailErr);
      }
    }

    return NextResponse.json(newInvoice);
  } catch (error: any) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

