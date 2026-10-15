import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, parseSessionCookie } from '../../../../lib/auth';
import { db } from '../../../../server/db';
import { tenants } from '../../../../server/schema';
import { eq, or } from 'drizzle-orm';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await parseSessionCookie(sessionVal);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up the tenant by either userId (Better Auth) or email
    const rows = await db.select().from(tenants).where(
      or(
        eq(tenants.userId, session.id),
        eq(tenants.email, session.email)
      )
    ).limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ tenant: null });
    }

    const t = rows[0];
    return NextResponse.json({
      tenant: {
        id: t.id,
        name: t.fullName,
        email: t.email,
        phone: t.phone || '',
        roomNumber: t.roomNumber || 'Awaiting Assignment',
        building: t.propertyLocation || 'Main Residence',
        status: t.status === 'active' ? 'Checked-In' : t.status === 'checked_out' ? 'Checked-Out' : 'Pending',
        contractStartDate: t.leaseStart || '',
        contractEndDate: t.leaseEnd || '',
        contractLengthMonths: t.contractLengthMonths || 6,
        monthlyRent: Number(t.rentAmount) || 0,
        depositAmount: Number(t.depositAmount) || 0,
        depositStatus: (t.depositStatus as any) || 'Pending',
        oneTimeAdminFee: Number(t.oneTimeAdminFee) || 90,
        hasExtraPerson: t.hasExtraPerson || false,
        idDocumentUrl: t.idDocumentUrl || '',
        idDocumentVerified: t.idVerificationStatus === 'verified',
        contractVerified: t.contractVerified || false,
        activeAddOns: Array.isArray(t.activeAddOns) ? t.activeAddOns : [],
        propertyType: t.propertyType || '',
        propertyLocation: t.propertyLocation || '',
      }
    });
  } catch (error: any) {
    console.error('Error fetching tenant profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
