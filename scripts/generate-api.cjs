const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '../app/api');
fs.mkdirSync(apiDir, { recursive: true });

function writeRoute(routePath, content) {
  const dir = path.join(apiDir, routePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'route.ts'), content);
}

// /api/health
writeRoute('health', `import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ status: "ok", paymentPolicy: "Desk Payment Only" }); }
`);

// /api/login
writeRoute('login', `import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { eq } from 'drizzle-orm';
import { users, tenants } from '../../../server/schema';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password, role } = await req.json();
    if (role === 'admin') {
      const u = await db.select().from(users).where(eq(users.email, email));
      if (u.length > 0 && await bcrypt.compare(password, u[0].passwordHash)) {
        return NextResponse.json({ message: 'Login successful', role: 'admin', id: u[0].id });
      }
    } else {
      const t = await db.select().from(tenants).where(eq(tenants.email, email));
      if (t.length > 0 && password === 'password123') {
        return NextResponse.json({ message: 'Login successful', role: 'tenant', id: t[0].id, name: t[0].fullName });
      }
    }
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`);

// /api/tenants
writeRoute('tenants', `import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { tenants } from '../../../server/schema';

export async function GET() {
  const allTenants = await db.select().from(tenants);
  return NextResponse.json(allTenants);
}
export async function POST(req: Request) {
  const data = await req.json();
  const res = await db.insert(tenants).values(data).returning();
  return NextResponse.json(res[0]);
}
`);

writeRoute('tenants/[id]', `import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { eq } from 'drizzle-orm';
import { tenants } from '../../../../server/schema';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json();
  const res = await db.update(tenants).set(data).where(eq(tenants.id, params.id)).returning();
  return NextResponse.json(res[0]);
}
`);

// /api/maintenance
writeRoute('maintenance', `import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { maintenanceTickets } from '../../../server/schema';

export async function GET() {
  const t = await db.select().from(maintenanceTickets);
  return NextResponse.json(t);
}
export async function POST(req: Request) {
  const data = await req.json();
  const res = await db.insert(maintenanceTickets).values(data).returning();
  return NextResponse.json(res[0]);
}
`);
writeRoute('maintenance/[id]', `import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { eq } from 'drizzle-orm';
import { maintenanceTickets } from '../../../../server/schema';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json();
  const res = await db.update(maintenanceTickets).set(data).where(eq(maintenanceTickets.id, params.id)).returning();
  return NextResponse.json(res[0]);
}
`);

// /api/housekeeping
writeRoute('housekeeping', `import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { housekeepingRequests } from '../../../server/schema';

export async function GET() {
  const h = await db.select().from(housekeepingRequests);
  return NextResponse.json(h);
}
export async function POST(req: Request) {
  const data = await req.json();
  const res = await db.insert(housekeepingRequests).values(data).returning();
  return NextResponse.json(res[0]);
}
`);

// /api/addons
writeRoute('addons', `import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { addOnServices } from '../../../server/schema';

export async function GET() {
  const a = await db.select().from(addOnServices);
  return NextResponse.json(a);
}
export async function POST(req: Request) {
  const data = await req.json();
  const res = await db.insert(addOnServices).values(data).returning();
  return NextResponse.json(res[0]);
}
`);

// /api/addons/requests
writeRoute('addons/requests', `import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { addOnRequests } from '../../../../server/schema';

export async function GET() {
  const a = await db.select().from(addOnRequests);
  return NextResponse.json(a);
}
export async function POST(req: Request) {
  const data = await req.json();
  const res = await db.insert(addOnRequests).values(data).returning();
  return NextResponse.json(res[0]);
}
`);
writeRoute('addons/requests/[id]', `import { NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { eq } from 'drizzle-orm';
import { addOnRequests } from '../../../../../server/schema';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json();
  const res = await db.update(addOnRequests).set(data).where(eq(addOnRequests.id, params.id)).returning();
  return NextResponse.json(res[0]);
}
`);

// /api/invoices
writeRoute('invoices', `import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { invoices } from '../../../server/schema';

export async function GET() {
  const i = await db.select().from(invoices);
  return NextResponse.json(i);
}
export async function POST(req: Request) {
  const data = await req.json();
  const res = await db.insert(invoices).values(data).returning();
  return NextResponse.json(res[0]);
}
`);
writeRoute('invoices/[id]', `import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { eq } from 'drizzle-orm';
import { invoices } from '../../../../server/schema';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json();
  const res = await db.update(invoices).set(data).where(eq(invoices.id, params.id)).returning();
  return NextResponse.json(res[0]);
}
`);

// /api/inspections
writeRoute('inspections', `import { NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { inspections } from '../../../server/schema';

export async function POST(req: Request) {
  const data = await req.json();
  const res = await db.insert(inspections).values(data).returning();
  return NextResponse.json(res[0]);
}
`);

writeRoute('inspections/[id]/photos', `import { NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { inventoryPhotos } from '../../../../../server/schema';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json();
  const res = await db.insert(inventoryPhotos).values({ inspectionId: params.id, ...data }).returning();
  return NextResponse.json(res[0]);
}
`);

console.log('API routes generated successfully in app/api');
