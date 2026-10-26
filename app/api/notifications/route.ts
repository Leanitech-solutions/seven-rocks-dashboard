import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { notifications, tenants } from '../../../server/schema';
import { desc } from 'drizzle-orm';
import { sendEmail } from '../../../lib/email';

import { parseSessionCookie, SESSION_COOKIE_NAME } from '../../../lib/auth';
import { cookies } from 'next/headers';

async function checkAdmin() {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await parseSessionCookie(sessionVal);
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return false;
  }
  return true;
}

export async function GET() {
  try {
    if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const allNotifications = await db.select().from(notifications).orderBy(desc(notifications.sentAt));
    return NextResponse.json(allNotifications);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const data = await req.json();

    // 1. Fetch tenants to resolve email recipients
    const allTenants = await db.select().from(tenants);

    let recipientTenants: typeof allTenants = [];
    if (data.targetAudience === 'All Tenants') {
      recipientTenants = allTenants.filter(t => t.email && t.email.includes('@'));
    } else if (data.targetAudience === 'Specific Building') {
      recipientTenants = allTenants.filter(t => 
        (t.propertyLocation === data.targetValue) &&
        t.email && t.email.includes('@')
      );
    } else if (data.targetAudience === 'Specific Tenant') {
      recipientTenants = allTenants.filter(t => 
        (t.fullName === data.targetValue || t.id === data.targetValue) &&
        t.email && t.email.includes('@')
      );
    } else if (data.targetAudience === 'Bulk Tenants' && data.targetValue) {
      const ids = String(data.targetValue).split(',').map(s => s.trim());
      recipientTenants = allTenants.filter(t => ids.includes(t.id) && t.email && t.email.includes('@'));
    }

    // 2. Dispatch via Google Workspace email transport
    const toEmails = recipientTenants.map(t => t.email);
    let dispatchSuccess = true;
    let dispatchError: string | undefined;

    if (toEmails.length > 0) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FDFCF7; margin: 0; padding: 24px; color: #1e293b; }
              .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #E5E0D8; box-shadow: 0 4px 12px rgba(90, 90, 64, 0.06); }
              .header { border-bottom: 2px solid #5A5A40; padding-bottom: 16px; margin-bottom: 24px; }
              .brand { font-size: 16px; font-weight: 800; color: #5A5A40; letter-spacing: 0.5px; text-transform: uppercase; }
              h2 { color: #2C2C20; font-size: 20px; font-weight: 700; margin: 8px 0 0; }
              .content { font-size: 14px; line-height: 1.6; color: #475569; white-space: pre-wrap; margin: 20px 0; }
              .footer { margin-top: 32px; font-size: 11px; color: #8C8C73; border-top: 1px solid #E5E0D8; padding-top: 16px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <div class="brand">Seven Rocks Co-Living</div>
                <h2>${data.title}</h2>
              </div>
              <div class="content">${data.message}</div>
              <div class="footer">
                Official resident alert dispatched via Google Workspace.<br>
                Seven Rocks Property Operations &bull; info@sevenrocksvienna.com
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        const sendResult = await sendEmail({
          to: toEmails,
          subject: `[Seven Rocks Alert] ${data.title}`,
          html: emailHtml,
          text: `${data.title}\n\n${data.message}\n\n— Seven Rocks Property Operations`
        });
        dispatchSuccess = sendResult.success;
        if (!sendResult.success) {
          dispatchError = sendResult.error;
          console.warn('Google Workspace email dispatch warning:', sendResult.error);
        }
      } catch (err: any) {
        dispatchSuccess = false;
        dispatchError = err.message;
        console.warn('Failed to send email:', err.message);
      }
    }

    // 3. Save notification record with delivery metadata
    data.deliveredCount = toEmails.length;
    data.sentAt = new Date();

    const res = await db.insert(notifications).values(data).returning();
    return NextResponse.json({
      ...res[0],
      dispatchedCount: toEmails.length,
      emailDispatchSuccess: dispatchSuccess,
      emailDispatchError: dispatchError
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
