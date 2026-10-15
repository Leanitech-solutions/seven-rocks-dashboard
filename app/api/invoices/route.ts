import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { invoices, tenants } from '../../../server/schema';
import { eq } from 'drizzle-orm';
import { sendInvoiceNotificationEmail } from '../../../lib/email';
import { formatId } from '../../../lib/formatId';

export async function GET() {
  const i = await db.select().from(invoices);
  return NextResponse.json(i);
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const res = await db.insert(invoices).values(data).returning();
    const newInvoice = res[0];

    if (newInvoice && newInvoice.tenantId) {
      const tenantRes = await db.select().from(tenants).where(eq(tenants.id, newInvoice.tenantId));
      if (tenantRes.length > 0) {
        const tenant = tenantRes[0];
        
        const hostHeader = req.headers.get('host') || 'localhost:3000';
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const origin = req.headers.get('origin') || `${protocol}://${hostHeader}`;
        
        await sendInvoiceNotificationEmail({
          toEmail: tenant.email,
          tenantName: tenant.fullName,
          invoiceId: formatId(newInvoice.id),
          amount: newInvoice.amount,
          dueDate: newInvoice.dueDate,
          description: newInvoice.description || undefined,
          portalUrl: `${origin}/resident`,
        }).catch(err => {
          console.error('Failed to send invoice email:', err);
        });
      }
    }

    return NextResponse.json(newInvoice);
  } catch (error: any) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

