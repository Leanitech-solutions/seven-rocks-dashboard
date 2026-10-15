import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { v4 as uuidv4 } from 'uuid';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be a Neon connection string");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

// ─── 4 Tenant Accounts with individual passwords ────────────────────────────
// Each password is unique. Credentials are printed to console after seeding.
const SEED_TENANTS = [
  {
    fullName: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    password: 'Sarah@2026!',
    phone: '+49 176 1234567',
    roomNumber: 'Apt 204-A',
    propertyType: 'Co-Living',
    propertyLocation: 'Berlin Mitte Central',
    leaseStart: '2026-04-10',
    leaseEnd: '2026-08-10',
    contractLengthMonths: 4,
    rentAmount: '1200',
    depositAmount: '1800',
    depositStatus: 'Paid',
    status: 'active',
    idVerificationStatus: 'verified',
    contractVerified: true,
    hasExtraPerson: false,
    oneTimeAdminFee: '90',
    activeAddOns: ['Fitness (Mo - €30)', 'Basic Kitchen Kit (€28/Mo)'],
  },
  {
    fullName: 'Alexander Lindqvist',
    email: 'alex.l@example.com',
    password: 'Alex@Rocks26',
    phone: '+46 8 505 1234',
    roomNumber: 'Apt 101-B',
    propertyType: 'Co-Living',
    propertyLocation: 'Berlin Mitte Central',
    leaseStart: '2026-03-10',
    leaseEnd: '2027-03-10',
    contractLengthMonths: 12,
    rentAmount: '1500',
    depositAmount: '3000',
    depositStatus: 'Paid',
    status: 'active',
    idVerificationStatus: 'verified',
    contractVerified: true,
    hasExtraPerson: true,
    oneTimeAdminFee: '90',
    activeAddOns: ['Combo Package (Mo - €45)', 'Complete Kitchen Kit (€68/Mo)', 'Laundry Services (€15/Mo)'],
  },
  {
    fullName: 'Marcus Vance',
    email: 'marcus.v@example.com',
    password: 'Marcus#7Rocks',
    phone: '+44 20 7946 0192',
    roomNumber: 'Apt 305',
    propertyType: 'Co-Living',
    propertyLocation: 'Munich Schwabing Co-Living',
    leaseStart: '2026-08-09',
    leaseEnd: '2027-02-09',
    contractLengthMonths: 6,
    rentAmount: '1300',
    depositAmount: '2600',
    depositStatus: 'Pending',
    status: 'pending',
    idVerificationStatus: 'pending',
    contractVerified: false,
    hasExtraPerson: false,
    oneTimeAdminFee: '90',
    activeAddOns: ['Household Textiles Kit (€20/Mo)'],
  },
  {
    fullName: 'Yuki Sato',
    email: 'yuki.sato@example.com',
    password: 'Yuki2026$SR',
    phone: '+81 90 1234 5678',
    roomNumber: 'Apt 410-C',
    propertyType: 'Co-Living',
    propertyLocation: 'Berlin Mitte Central',
    leaseStart: '2026-05-10',
    leaseEnd: '2027-05-10',
    contractLengthMonths: 12,
    rentAmount: '1100',
    depositAmount: '2200',
    depositStatus: 'Paid',
    status: 'active',
    idVerificationStatus: 'verified',
    contractVerified: true,
    hasExtraPerson: false,
    oneTimeAdminFee: '90',
    activeAddOns: ['Wellness (Mo - €25)', 'Laundry Services (€15/Mo)'],
  },
];

async function seedData() {
  console.log('\n🌱 Seeding tenant accounts with hashed passwords...\n');

  const tenantIds: string[] = [];

  try {
    // ── 1. Seed Tenants ──────────────────────────────────────────────────────
    for (const t of SEED_TENANTS) {
      const existing = await db.select().from(schema.tenants).where(eq(schema.tenants.email, t.email));

      if (existing.length > 0) {
        console.log(`⚠️  Skipped (already exists): ${t.email}`);
        tenantIds.push(existing[0].id);
        continue;
      }

      const passwordHash = await bcrypt.hash(t.password, 10);

      const inserted = await db.insert(schema.tenants).values({
        userId: uuidv4(),
        fullName: t.fullName,
        email: t.email,
        passwordHash,
        phone: t.phone,
        roomNumber: t.roomNumber,
        propertyType: t.propertyType,
        propertyLocation: t.propertyLocation,
        leaseStart: t.leaseStart,
        leaseEnd: t.leaseEnd,
        contractLengthMonths: t.contractLengthMonths,
        rentAmount: t.rentAmount,
        depositAmount: t.depositAmount,
        depositStatus: t.depositStatus as any,
        status: t.status,
        idVerificationStatus: t.idVerificationStatus,
        contractVerified: t.contractVerified,
        hasExtraPerson: t.hasExtraPerson,
        oneTimeAdminFee: t.oneTimeAdminFee,
        activeAddOns: t.activeAddOns,
      }).returning();

      tenantIds.push(inserted[0].id);
      console.log(`✅ Created: ${t.fullName} <${t.email}>`);
    }

    // ── 2. Seed Add-on Catalog ───────────────────────────────────────────────
    console.log('\n🛍️  Seeding add-on catalog...');
    const catalogItems = [
      { name: 'Fitness (Mo)', description: 'Monthly gym access', price: '30', type: 'Subscription' },
      { name: 'Wellness (Mo)', description: 'Wellness amenity access', price: '25', type: 'Subscription' },
      { name: 'Combo Package (Mo)', description: 'Fitness + Wellness bundle', price: '45', type: 'Subscription' },
      { name: 'Basic Kitchen Kit', description: 'Essential kitchen equipment', price: '28', type: 'Subscription' },
      { name: 'Complete Kitchen Kit', description: 'Full kitchen equipment set', price: '68', type: 'Subscription' },
      { name: 'Laundry Services', description: 'Monthly laundry service', price: '15', type: 'Subscription' },
      { name: 'Household Textiles Kit', description: 'Bedding and towel set', price: '20', type: 'Subscription' },
    ];

    const serviceIds: string[] = [];
    for (const c of catalogItems) {
      const inserted = await db.insert(schema.addOnServices).values(c).returning();
      serviceIds.push(inserted[0].id);
    }
    console.log(`   Added ${serviceIds.length} catalog items`);

    // ── 3. Seed Maintenance Tickets ──────────────────────────────────────────
    if (tenantIds.length >= 2) {
      console.log('\n🔧 Seeding maintenance tickets...');
      await db.insert(schema.maintenanceTickets).values([
        {
          tenantId: tenantIds[0],
          subject: 'Bathroom tap dripping',
          description: 'The cold water tap in the bathroom has been dripping overnight.',
          priority: 'Medium',
          status: 'Open',
        },
        {
          tenantId: tenantIds[1],
          subject: 'Wi-Fi router intermittent',
          description: 'Internet drops every evening between 8-10pm.',
          priority: 'High',
          status: 'In Progress',
        },
        {
          tenantId: tenantIds[3] ?? tenantIds[0],
          subject: 'Wardrobe door off hinge',
          description: 'Left wardrobe door hinge is loose and door does not close properly.',
          priority: 'Low',
          status: 'Open',
        },
      ]);
      console.log('   Added 3 maintenance tickets');
    }

    // ── 4. Seed Housekeeping Requests ────────────────────────────────────────
    if (tenantIds.length >= 1) {
      console.log('\n🧹 Seeding housekeeping requests...');
      await db.insert(schema.housekeepingRequests).values([
        {
          tenantId: tenantIds[0],
          date: '2026-08-10',
          timeSlot: '10:00 - 12:00',
          status: 'Pending',
          specialInstructions: 'Please focus on the kitchen area.',
        },
        {
          tenantId: tenantIds[1],
          date: '2026-08-12',
          timeSlot: '14:00 - 16:00',
          status: 'Approved',
          specialInstructions: '',
        },
      ]);
      console.log('   Added 2 housekeeping requests');
    }

    // ── 5. Seed Invoices ─────────────────────────────────────────────────────
    if (tenantIds.length >= 4) {
      console.log('\n🧾 Seeding invoices...');
      await db.insert(schema.invoices).values([
        {
          tenantId: tenantIds[0],
          amount: '1320',
          status: 'Paid',
          dueDate: '2026-08-01',
          type: 'Rent',
          description: 'Monthly Rent - August 2026',
          rentAmount: '1200',
          addOnTotal: '58',
          adminFee: '0',
          subtotal: '1200',
          vatRate: '10',
          vatAmount: '120',
        },
        {
          tenantId: tenantIds[1],
          amount: '1760',
          status: 'Pending',
          dueDate: '2026-08-01',
          type: 'Rent',
          description: 'Monthly Rent - August 2026 (+ extra person surcharge)',
          rentAmount: '1500',
          extraPersonSurcharge: '85',
          addOnTotal: '128',
          adminFee: '0',
          subtotal: '1600',
          vatRate: '10',
          vatAmount: '160',
        },
        {
          tenantId: tenantIds[2],
          amount: '1469',
          status: 'Pending',
          dueDate: '2026-08-09',
          type: 'Rent',
          description: 'First Month Rent + Admin Fee',
          rentAmount: '1300',
          addOnTotal: '20',
          adminFee: '90',
          depositAmount: '0',
          subtotal: '1336',
          vatRate: '10',
          vatAmount: '133',
        },
        {
          tenantId: tenantIds[3],
          amount: '1210',
          status: 'Overdue',
          dueDate: '2026-07-01',
          type: 'Rent',
          description: 'Monthly Rent - July 2026',
          rentAmount: '1100',
          addOnTotal: '40',
          subtotal: '1100',
          vatRate: '10',
          vatAmount: '110',
        },
      ]);
      console.log('   Added 4 invoices');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Seeding complete. Tenant login credentials:\n');
    SEED_TENANTS.forEach(t => {
      console.log(`   ${t.fullName.padEnd(22)} ${t.email.padEnd(32)} password: ${t.password}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

seedData().catch(console.error);

