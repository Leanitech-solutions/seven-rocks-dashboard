import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { eq } from 'drizzle-orm';
import { maintenanceTickets, tenants } from '../../../../server/schema';
import { sendTicketUpdateEmail } from '../../../../lib/email';
import { formatId } from '../../../../lib/formatId';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    
    // Fetch previous state to detect status changes
    const previousTicketRes = await db.select().from(maintenanceTickets).where(eq(maintenanceTickets.id, id));
    
    const res = await db.update(maintenanceTickets).set(data).where(eq(maintenanceTickets.id, id)).returning();
    const updatedTicket = res[0];

    // If status changed and we have a tenant, send notification
    if (
      updatedTicket && 
      previousTicketRes.length > 0 && 
      previousTicketRes[0].status !== updatedTicket.status &&
      updatedTicket.tenantId
    ) {
      const tenantRes = await db.select().from(tenants).where(eq(tenants.id, updatedTicket.tenantId));
      if (tenantRes.length > 0) {
        const tenant = tenantRes[0];
        
        const hostHeader = req.headers.get('host') || 'localhost:3000';
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const origin = req.headers.get('origin') || `${protocol}://${hostHeader}`;
        
        await sendTicketUpdateEmail({
          toEmail: tenant.email,
          tenantName: tenant.fullName,
          ticketId: formatId(updatedTicket.id),
          subject: updatedTicket.subject,
          status: updatedTicket.status || 'Updated',
          updateNotes: `Status changed from ${previousTicketRes[0].status} to ${updatedTicket.status}.`,
          portalUrl: `${origin}/resident`,
        }).catch(err => {
          console.error('Failed to send ticket update email:', err);
        });
      }
    }

    return NextResponse.json(updatedTicket);
  } catch (error: any) {
    console.error('Ticket update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
