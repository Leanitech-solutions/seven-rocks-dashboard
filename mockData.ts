import { Tenant, SupportTicket, AddOnRequest, HousekeepingRequest, Invoice, Notification, ActivityLog, PolicyFAQ, AppSettings, AddOnService } from './types';

// Helper to get formatted dates relative to current date (2026-07-09)
const baseDate = new Date('2026-07-09');
const getRelativeDateStr = (offsetDays: number): string => {
  const d = new Date(baseDate);
  d.setDate(baseDate.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'TEN-802',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    password: 'password123',
    phone: '+49 176 1234567',
    roomNumber: 'Apt 204-A',
    building: 'Berlin Mitte Central',
    status: 'Checked-In',
    contractStartDate: getRelativeDateStr(-90),
    contractEndDate: getRelativeDateStr(30), // 4 months total (< 6 months)
    contractLengthMonths: 4,
    idDocumentUrl: 'passport_sarah_jenkins.pdf',
    contractFileName: 'lease_agreement_sarah_jenkins.pdf',
    hasExtraPerson: false,
    depositStatus: 'Paid',
    depositAmount: 1800, // 1.5 months of €1200 rent (contract < 6 months)
    monthlyRent: 1200,
    oneTimeAdminFee: 90,
    activeAddOns: ['Fitness (Mo - €30)', 'Basic Kitchen Kit (€28/Mo)'],
    checkInImages: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=600&q=80'
    ],
    checkOutImages: [],
    inventoryItems: [
      { name: 'Double Bed (Comfort Series)', quantity: 1, condition: 'Good' },
      { name: 'Ergonomic Desk Chair', quantity: 1, condition: 'Good' },
      { name: 'Working Desk (Oak)', quantity: 1, condition: 'Good' },
      { name: 'Induction Cooktop (Built-in)', quantity: 1, condition: 'Good' },
      { name: 'Wardrobe with Hangers', quantity: 1, condition: 'Good' },
      { name: 'Smart TV 43"', quantity: 1, condition: 'Good' },
      { name: 'RFID Room Keycard', quantity: 2, condition: 'Good' }
    ]
  },
  {
    id: 'TEN-415',
    name: 'Alexander Lindqvist',
    email: 'alex.l@example.com',
    password: 'password123',
    phone: '+46 8 505 1234',
    roomNumber: 'Apt 101-B',
    building: 'Berlin Mitte Central',
    status: 'Checked-In',
    contractStartDate: getRelativeDateStr(-120),
    contractEndDate: getRelativeDateStr(240), // 12 months total (> 6 months)
    contractLengthMonths: 12,
    idDocumentUrl: 'national_id_alex_l.pdf',
    contractFileName: 'lease_agreement_alexander_l.pdf',
    hasExtraPerson: true,
    extraPersonName: 'Emma Lindqvist',
    depositStatus: 'Paid',
    depositAmount: 3000, // 2 months of €1500 rent (contract > 6 months)
    monthlyRent: 1500,
    oneTimeAdminFee: 90,
    activeAddOns: ['Combo Package (Mo - €45)', 'Complete Kitchen Kit (€68/Mo)', 'Laundry Services (€15/Mo)'],
    checkInImages: [
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80'
    ],
    checkOutImages: [],
    inventoryItems: [
      { name: 'King Bed (Elite Series)', quantity: 1, condition: 'Good' },
      { name: 'Premium Swivel Leather Chair', quantity: 1, condition: 'Good' },
      { name: 'Glass Coffee Table', quantity: 1, condition: 'Good' },
      { name: 'Three-Seater Lounge Sofa', quantity: 1, condition: 'Fair' },
      { name: 'Built-in Microwave Oven', quantity: 1, condition: 'Good' },
      { name: 'Dining Table & Chair Set', quantity: 2, condition: 'Good' },
      { name: 'Smart Hub Device', quantity: 1, condition: 'Good' },
      { name: 'RFID Room Keycard', quantity: 2, condition: 'Good' }
    ]
  },
  {
    id: 'TEN-109',
    name: 'Marcus Vance',
    email: 'marcus.v@example.com',
    password: 'password123',
    phone: '+44 20 7946 0192',
    roomNumber: 'Apt 305',
    building: 'Munich Schwabing Co-Living',
    status: 'Pending', // Pending Check-in
    contractStartDate: getRelativeDateStr(3),
    contractEndDate: getRelativeDateStr(183), // 6 months total (>=6 months -> 2 months deposit)
    contractLengthMonths: 6,
    idDocumentUrl: 'passport_marcus_vance.pdf',
    hasExtraPerson: false,
    depositStatus: 'Pending',
    depositAmount: 2600, // 2 months of €1300 rent
    monthlyRent: 1300,
    oneTimeAdminFee: 90,
    activeAddOns: ['Household Textiles Kit (€20/Mo)'],
    checkInImages: [],
    checkOutImages: [],
    inventoryItems: [
      { name: 'Single Bed (Standard)', quantity: 1, condition: 'Good' },
      { name: 'Desk Chair', quantity: 1, condition: 'Good' },
      { name: 'Writing Desk', quantity: 1, condition: 'Good' },
      { name: 'Wardrobe with Hangers', quantity: 1, condition: 'Good' },
      { name: 'RFID Room Keycard', quantity: 2, condition: 'Good' }
    ]
  },
  {
    id: 'TEN-923',
    name: 'Chantal Dubois',
    email: 'chantal.dubois@example.com',
    password: 'password123',
    phone: '+33 6 5551 2345',
    roomNumber: 'Studio 12',
    building: 'Munich Schwabing Co-Living',
    status: 'Checked-Out',
    contractStartDate: getRelativeDateStr(-180),
    contractEndDate: getRelativeDateStr(-2), // Completed contract
    contractLengthMonths: 6,
    idDocumentUrl: 'passport_chantal_d.pdf',
    hasExtraPerson: false,
    depositStatus: 'Refunded',
    depositAmount: 2800, // 2 months of €1400 rent
    monthlyRent: 1400,
    oneTimeAdminFee: 90,
    activeAddOns: [],
    checkInImages: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80'
    ],
    checkOutImages: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80'
    ],
    inventoryItems: [
      { name: 'Studio Single Bed', quantity: 1, condition: 'Good' },
      { name: 'Compact Armchair', quantity: 1, condition: 'Good' },
      { name: 'Induction Hotplate', quantity: 1, condition: 'Good' },
      { name: 'RFID Room Keycard', quantity: 1, condition: 'Good' }
    ]
  },
  {
    id: 'TEN-506',
    name: 'Yuki Sato',
    email: 'yuki.sato@example.com',
    password: 'password123',
    phone: '+81 90 1234 5678',
    roomNumber: 'Apt 410-C',
    building: 'Berlin Mitte Central',
    status: 'Checked-In',
    contractStartDate: getRelativeDateStr(-60),
    contractEndDate: getRelativeDateStr(300), // 12 months total
    contractLengthMonths: 12,
    idDocumentUrl: 'residence_permit_yuki.pdf',
    contractFileName: 'lease_agreement_yuki_sato.pdf',
    hasExtraPerson: false,
    depositStatus: 'Paid',
    depositAmount: 2200, // 2 months of €1100 rent
    monthlyRent: 1100,
    oneTimeAdminFee: 90,
    activeAddOns: ['Wellness (Mo - €25)', 'Laundry Services (€15/Mo)'],
    checkInImages: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80'
    ],
    checkOutImages: [],
    inventoryItems: [
      { name: 'Comfort Single Bed', quantity: 1, condition: 'Good' },
      { name: 'Standard Desk Chair', quantity: 1, condition: 'Good' },
      { name: 'Compact Wardrobe', quantity: 1, condition: 'Good' },
      { name: 'RFID Room Keycard', quantity: 2, condition: 'Good' }
    ]
  },
  {
    id: 'TEN-331',
    name: 'David Miller',
    email: 'david.miller@example.com',
    password: 'password123',
    phone: '+1 555 987 6543',
    roomNumber: 'Studio 04',
    building: 'Munich Schwabing Co-Living',
    status: 'Checked-In',
    contractStartDate: getRelativeDateStr(-15),
    contractEndDate: getRelativeDateStr(75), // 3 months total (<6 months)
    contractLengthMonths: 3,
    idDocumentUrl: 'drivers_license_david.pdf',
    hasExtraPerson: true,
    extraPersonName: 'Grace Miller',
    depositStatus: 'Paid',
    depositAmount: 2475, // 1.5 months of €1650 rent
    monthlyRent: 1650,
    oneTimeAdminFee: 90,
    activeAddOns: ['Car Parking (€95/Mo)', 'Fitness (10 Days - €50)'],
    checkInImages: [
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80'
    ],
    checkOutImages: [],
    inventoryItems: [
      { name: 'Double Bed (Comfort Series)', quantity: 1, condition: 'Good' },
      { name: 'Desk Chair', quantity: 1, condition: 'Good' },
      { name: 'RFID Room Keycard', quantity: 2, condition: 'Good' }
    ]
  }
];

export const INITIAL_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'TCK-1049',
    tenantId: 'TEN-802',
    tenantName: 'Sarah Jenkins',
    roomNumber: 'Apt 204-A',
    building: 'Berlin Mitte Central',
    category: 'Internet/Wi-Fi',
    subject: 'Intermittent Wi-Fi dropping in bedroom',
    description: 'The Wi-Fi signal in the bedroom drops completely every hour. Works fine in the living room, but hard to work from my desk.',
    priority: 'Medium',
    status: 'Open',
    createdAt: getRelativeDateStr(-1)
  },
  {
    id: 'TCK-1048',
    tenantId: 'TEN-415',
    tenantName: 'Alexander Lindqvist',
    roomNumber: 'Apt 101-B',
    building: 'Berlin Mitte Central',
    category: 'Plumbing',
    subject: 'Kitchen sink dripping rapidly',
    description: 'The kitchen faucet is dripping rapidly, causing water accumulation and a constant noise. Need washer replacement.',
    priority: 'Low',
    status: 'In Progress',
    createdAt: getRelativeDateStr(-3)
  },
  {
    id: 'TCK-1047',
    tenantId: 'TEN-506',
    tenantName: 'Yuki Sato',
    roomNumber: 'Apt 410-C',
    building: 'Berlin Mitte Central',
    category: 'Key/Access',
    subject: 'Keycard reader slow to respond',
    description: 'The room RFID entrance reader takes 3-4 attempts before green light flashes. Battery might be low.',
    priority: 'Medium',
    status: 'Resolved',
    createdAt: getRelativeDateStr(-5)
  },
  {
    id: 'TCK-1046',
    tenantId: 'TEN-331',
    tenantName: 'David Miller',
    roomNumber: 'Studio 04',
    building: 'Munich Schwabing Co-Living',
    category: 'Electrical',
    subject: 'Power trip in kitchen after turning on kettle',
    description: 'The kitchen circuit breaker tripped twice today when running both the kettle and microwave simultaneously.',
    priority: 'High',
    status: 'Open',
    createdAt: getRelativeDateStr(0)
  }
];

export const INITIAL_ADDON_REQUESTS: AddOnRequest[] = [
  {
    id: 'REQ-501',
    tenantId: 'TEN-802',
    tenantName: 'Sarah Jenkins',
    roomNumber: 'Apt 204-A',
    building: 'Berlin Mitte Central',
    category: 'Equipment Kits',
    serviceName: 'Complete Kitchen Kit',
    priceDetails: '€68/Mo',
    priceValue: 68,
    requestDate: getRelativeDateStr(-1),
    status: 'Pending',
    paymentOption: 'Request Invoice (Pay at Desk)'
  },
  {
    id: 'REQ-502',
    tenantId: 'TEN-506',
    tenantName: 'Yuki Sato',
    roomNumber: 'Apt 410-C',
    building: 'Berlin Mitte Central',
    category: 'Fitness & Wellness',
    serviceName: 'Combo Package',
    priceDetails: '€45/Mo',
    priceValue: 45,
    requestDate: getRelativeDateStr(-2),
    status: 'Approved',
    paymentOption: 'Pay at Desk',
    paymentStatus: 'Paid',
    paymentChannel: 'Desk',
    paymentMethod: 'Desk Terminal'
  },
  {
    id: 'REQ-503',
    tenantId: 'TEN-331',
    tenantName: 'David Miller',
    roomNumber: 'Studio 04',
    building: 'Munich Schwabing Co-Living',
    category: 'Other',
    serviceName: 'Airport Transfers',
    priceDetails: '€65.00 one-time',
    priceValue: 65,
    requestDate: getRelativeDateStr(-4),
    status: 'Approved',
    paymentOption: 'Pay at Desk',
    paymentChannel: 'Desk',
    paymentMethod: 'Pay at Desk'
  },
  {
    id: 'REQ-504',
    tenantId: 'TEN-415',
    tenantName: 'Alexander Lindqvist',
    roomNumber: 'Apt 101-B',
    building: 'Berlin Mitte Central',
    category: 'Hotel Booking',
    serviceName: 'Breakfast Only Upgrade',
    priceDetails: '€12.50/Day',
    priceValue: 12.5,
    requestDate: getRelativeDateStr(0),
    status: 'Pending',
    paymentOption: 'Pay at Desk'
  },
  {
    id: 'REQ-505',
    tenantId: 'TEN-109',
    tenantName: 'Marcus Vance',
    roomNumber: 'Apt 305',
    building: 'Munich Schwabing Co-Living',
    category: 'Other',
    serviceName: 'Pet Accommodation',
    priceDetails: '€50/Mo',
    priceValue: 50,
    requestDate: getRelativeDateStr(-1),
    status: 'Pending',
    paymentOption: 'Pay at Desk'
  }
];

export const INITIAL_HOUSEKEEPING_REQUESTS: HousekeepingRequest[] = [
  {
    id: 'HKP-301',
    tenantId: 'TEN-802',
    tenantName: 'Sarah Jenkins',
    roomNumber: 'Apt 204-A',
    building: 'Berlin Mitte Central',
    scheduleDate: getRelativeDateStr(2), // 2 days from now (satisfies 24-48h notice)
    requestedAt: getRelativeDateStr(0),
    frequency: 'Single Use',
    priceValue: 40,
    status: 'Scheduled',
    notes: 'Please vacuum thoroughly due to pollen allergy.'
  },
  {
    id: 'HKP-302',
    tenantId: 'TEN-415',
    tenantName: 'Alexander Lindqvist',
    roomNumber: 'Apt 101-B',
    building: 'Berlin Mitte Central',
    scheduleDate: getRelativeDateStr(1), // 1 day from now
    requestedAt: getRelativeDateStr(-1),
    frequency: 'Bi-Weekly',
    priceValue: 120,
    status: 'Scheduled',
    notes: 'Standard cleaning schedule.'
  },
  {
    id: 'HKP-303',
    tenantId: 'TEN-506',
    tenantName: 'Yuki Sato',
    roomNumber: 'Apt 410-C',
    building: 'Berlin Mitte Central',
    scheduleDate: getRelativeDateStr(-4),
    requestedAt: getRelativeDateStr(-6),
    frequency: 'Monthly',
    priceValue: 140,
    status: 'Completed',
    notes: 'Everything was great, thank you.'
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'INV-4410',
    tenantId: 'TEN-802',
    tenantName: 'Sarah Jenkins',
    roomNumber: 'Apt 204-A',
    building: 'Berlin Mitte Central',
    date: getRelativeDateStr(-8),
    dueDate: getRelativeDateStr(2),
    rentAmount: 1200,
    extraPersonSurcharge: 0,
    addOnTotal: 58, // Fitness €30 + Kitchen €28
    adminFee: 0,
    depositAmount: 0,
    subtotal: 1258,
    vatRate: 10,
    vatAmount: 125.8,
    totalAmount: 1383.8,
    status: 'Pending',
    paymentMethod: undefined
  },
  {
    id: 'INV-4409',
    tenantId: 'TEN-415',
    tenantName: 'Alexander Lindqvist',
    roomNumber: 'Apt 101-B',
    building: 'Berlin Mitte Central',
    date: getRelativeDateStr(-30),
    dueDate: getRelativeDateStr(-20),
    rentAmount: 1500,
    extraPersonSurcharge: 85, // Extra person active
    addOnTotal: 128, // Combo €45 + Kitchen €68 + Laundry €15
    adminFee: 0,
    depositAmount: 0,
    subtotal: 1713,
    vatRate: 10,
    vatAmount: 171.3,
    totalAmount: 1884.3,
    status: 'Paid',
    paymentMethod: 'Pay at Desk',
    paymentDate: getRelativeDateStr(-25),
    paymentChannel: 'Desk'
  },
  {
    id: 'INV-4408',
    tenantId: 'TEN-506',
    tenantName: 'Yuki Sato',
    roomNumber: 'Apt 410-C',
    building: 'Berlin Mitte Central',
    date: getRelativeDateStr(-30),
    dueDate: getRelativeDateStr(-20),
    rentAmount: 1100,
    extraPersonSurcharge: 0,
    addOnTotal: 40, // Wellness €25 + Laundry €15
    adminFee: 0,
    depositAmount: 0,
    subtotal: 1140,
    vatRate: 10,
    vatAmount: 114,
    totalAmount: 1254,
    status: 'Paid',
    paymentMethod: 'Pay at Desk',
    paymentDate: getRelativeDateStr(-22),
    paymentChannel: 'Desk'
  },
  {
    id: 'INV-4407',
    tenantId: 'TEN-331',
    tenantName: 'David Miller',
    roomNumber: 'Studio 04',
    building: 'Munich Schwabing Co-Living',
    date: getRelativeDateStr(-45),
    dueDate: getRelativeDateStr(-35),
    rentAmount: 1650,
    extraPersonSurcharge: 85, // Extra person
    addOnTotal: 145, // Parking €95 + Fitness €50
    adminFee: 90, // One time admin fee
    depositAmount: 2475, // First month includes deposit!
    subtotal: 4445,
    vatRate: 10,
    vatAmount: 444.5,
    totalAmount: 4889.5,
    status: 'Paid',
    paymentMethod: 'Bank Transfer',
    paymentDate: getRelativeDateStr(-37),
    paymentChannel: 'Desk'
  },
  {
    id: 'INV-4411',
    tenantId: 'TEN-331',
    tenantName: 'David Miller',
    roomNumber: 'Studio 04',
    building: 'Munich Schwabing Co-Living',
    date: getRelativeDateStr(-5),
    dueDate: getRelativeDateStr(-1),
    rentAmount: 1650,
    extraPersonSurcharge: 85,
    addOnTotal: 145,
    adminFee: 0,
    depositAmount: 0,
    subtotal: 1880,
    vatRate: 10,
    vatAmount: 188,
    totalAmount: 2068,
    status: 'Overdue',
    paymentMethod: undefined
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'NTF-001',
    title: 'Routine Fire Alarm Testing',
    message: 'Dear residents, our annual fire alarm and safety sprinkler testing will occur on Thursday, July 12th between 10:00 AM and 2:00 PM. Expect short periodic alarm sounds.',
    targetAudience: 'All Tenants',
    sentAt: getRelativeDateStr(-2),
    readCount: 5,
    deliveredCount: 6
  },
  {
    id: 'NTF-002',
    title: 'Water Supply Maintenance - Munich Schwabing',
    message: 'The main water line will undergo urgent valve replacement on July 10th from 2:00 AM to 5:00 AM. Please store any drinking water you may need during these night hours.',
    targetAudience: 'Specific Building',
    targetValue: 'Munich Schwabing Co-Living',
    sentAt: getRelativeDateStr(-1),
    readCount: 2,
    deliveredCount: 3
  },
  {
    id: 'NTF-003',
    title: 'Parcel Awaiting in Locker #4',
    message: 'Hello Marcus, you have a courier parcel registered in the lobby locker #4. Please retrieve it using code 8840 within 48 hours.',
    targetAudience: 'Specific Tenant',
    targetValue: 'Marcus Vance',
    sentAt: getRelativeDateStr(0),
    readCount: 0,
    deliveredCount: 1
  }
];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'LOG-001',
    timestamp: '2026-07-09T04:30:00Z',
    type: 'addon',
    user: 'Admin (m.mahesh)',
    action: 'Approved Add-on Request',
    details: 'Yuki Sato - Combo Package (Mo - €45)'
  },
  {
    id: 'LOG-002',
    timestamp: '2026-07-09T02:15:00Z',
    type: 'tenant',
    user: 'System',
    action: 'New Rental Application Submitted',
    details: 'Marcus Vance - Munich Schwabing Apt 305'
  },
  {
    id: 'LOG-003',
    timestamp: '2026-07-08T18:45:00Z',
    type: 'billing',
    user: 'Admin (m.mahesh)',
    action: 'Generated Invoice INV-4411',
    details: 'David Miller - Monthly rent & surcharges'
  },
  {
    id: 'LOG-004',
    timestamp: '2026-07-08T14:10:00Z',
    type: 'ticket',
    user: 'Sarah Jenkins',
    action: 'Opened Support Ticket',
    details: 'Intermittent Wi-Fi dropping in bedroom'
  },
  {
    id: 'LOG-005',
    timestamp: '2026-07-07T10:30:00Z',
    type: 'notification',
    user: 'Admin (m.mahesh)',
    action: 'Dispatched Push Notification',
    details: '"Routine Fire Alarm Testing" to All Buildings'
  }
];

export const INITIAL_POLICIES: PolicyFAQ[] = [
  {
    id: 'FAQ-1',
    category: 'Surcharges & Fees',
    question: 'Extra Person Surcharge Rule',
    answer: 'A flat fee of €85.00/month is added to the rent if an additional person resides in the room. This must be registered with building management in advance.'
  },
  {
    id: 'FAQ-2',
    category: 'Security Deposit',
    question: 'How is the security deposit calculated?',
    answer: 'For stays shorter than 6 months (< 6 months), the deposit is equal to 1.5 months of rent. For stays of 6 months or longer (>= 6 months), the deposit is equal to 2 months of rent.'
  },
  {
    id: 'FAQ-3',
    category: 'Housekeeping',
    question: 'Advance notice for cleaning services',
    answer: 'Any booking of housekeeping or room laundry requires at least 24 to 48 hours advance notice so our housekeeping agency can schedule staff.'
  },
  {
    id: 'FAQ-4',
    category: 'One-Time Admin Fee',
    question: 'Is there a contract move-in fee?',
    answer: 'Yes, a standard non-refundable admin fee of €90.00 is billed on your first invoice to cover contract generation, keys provisioning, and greeting package setup.'
  }
];

export const INITIAL_SETTINGS: AppSettings = {
  lockSingleUseTermsTo6Months: true,
  requiresNotice24To48Hours: true,
  enforceGdprAnonymization: true,
  enableTwoFactorAuthLock: false,
  pricingTiers: {
    extraPersonSurcharge: 85.00,
    oneTimeAdminFee: 90.00,
    housekeepingMonthly: 140.00,
    housekeepingBiWeekly: 120.00,
    housekeepingSingle: 40.00
  }
};

export const BUILDINGS_LIST = [
  'Berlin Mitte Central',
  'Munich Schwabing Co-Living',
  'Frankfurt Westend Residence',
  'Hamburg Altona Hub'
];

export const INITIAL_CATALOG_ITEMS: AddOnService[] = [
  { 
    id: 'cat-fit-1', 
    category: 'fitness', 
    name: 'Fitness Pass', 
    price: '€30/Mo', 
    priceVal: 30, 
    desc: 'Unlimited access to the premium building fitness suite & weights.',
    options: ['€50/10 Days', '€20/Mo (Annual)', '€10/Day'],
    iconName: 'Dumbbell',
    badge: 'Popular'
  },
  { 
    id: 'cat-fit-2', 
    category: 'fitness', 
    name: 'Wellness Pass', 
    price: '€25/Mo', 
    priceVal: 25, 
    desc: 'Sauna, steam room, and relaxation lounge session permissions.',
    options: ['€40/10 Days', '€20/Mo (Annual)', '€10/Day'],
    iconName: 'Sparkles'
  },
  { 
    id: 'cat-fit-3', 
    category: 'fitness', 
    name: 'Combo Package', 
    price: '€45/Mo', 
    priceVal: 45, 
    desc: 'Best value! Complete access to both Gym & Wellness areas.',
    options: ['€60/15 Days', '€35/Mo (Annual)', '€15/Day'],
    iconName: 'Sparkles',
    badge: 'Best Value'
  },
  { 
    id: 'cat-kit-1', 
    category: 'kits', 
    name: 'Basic Kitchen Kit', 
    price: '€28/Mo', 
    priceVal: 28, 
    desc: 'Lease set of 2 frying pans, 2 pots, essential dinnerware & stainless steel cutlery.',
    options: ['Includes standard pans, pots, dinnerware & cutlery'],
    iconName: 'CookingPot'
  },
  { 
    id: 'cat-kit-2', 
    category: 'kits', 
    name: 'Complete Kitchen Kit', 
    price: '€68/Mo', 
    priceVal: 68, 
    desc: 'Premium pots + Nespresso Vertuo coffee machine, electric kettle, and steel toaster.',
    options: ['Premium pans, dinnerware + Nespresso, kettle, toaster'],
    iconName: 'CookingPot',
    badge: 'High Demand'
  },
  { 
    id: 'cat-kit-3', 
    category: 'kits', 
    name: 'Household Textiles Kit', 
    price: '€20/Mo', 
    priceVal: 20, 
    desc: 'Hypoallergenic pillow, heavy duvet, 2 bedding sets, and 4 premium bath towels.',
    options: ['Includes pillow, duvet, 2 bedding sets, 4 bath towels'],
    iconName: 'CookingPot'
  },
  { 
    id: 'cat-ut-1', 
    category: 'utilities', 
    name: 'Laundry Services', 
    price: '€15/Mo', 
    priceVal: 15, 
    desc: 'Bi-weekly washing and folding of textiles/sheets by our certified partner.',
    options: ['Monthly textile / bed linen washing by laundry partner'],
    iconName: 'WashingMachine'
  },
  { 
    id: 'cat-ut-2', 
    category: 'utilities', 
    name: 'Laundry Room Access', 
    price: '€1.00/load', 
    priceVal: 1, 
    desc: 'Tokenless digital activation on community washers/dryers.',
    options: ['Tokenless digital activation on community washers/dryers'],
    iconName: 'WashingMachine'
  },
  { 
    id: 'cat-oth-1', 
    category: 'other', 
    name: 'Car Parking Space', 
    price: '€95/Mo', 
    priceVal: 95, 
    desc: 'Secure, CCTV-monitored underground parking spot with automatic RFID barrier.',
    options: ['Underground secure RFID park slot'],
    iconName: 'Compass'
  },
  { 
    id: 'cat-oth-2', 
    category: 'other', 
    name: 'Extra Space Storage', 
    price: '€45/Mo', 
    priceVal: 45, 
    desc: 'Lockable steel basement cage unit (approx 4m³) for luggage or boxes.',
    options: ['Basement steel padlock wire cage (4m³ approx)'],
    iconName: 'Compass'
  },
  { 
    id: 'cat-oth-3', 
    category: 'other', 
    name: 'Airport Transfers', 
    price: '€65.00 one-time', 
    priceVal: 65, 
    desc: 'Mercedes Benz E-Class partner transfer, flat rate.',
    options: ['Mercedes Benz E-Class partner transfer, flat rate'],
    iconName: 'Compass'
  },
  { 
    id: 'cat-oth-4', 
    category: 'other', 
    name: 'Breakfast Only', 
    price: '€12.50/Day', 
    priceVal: 12.5, 
    desc: 'Hotel booking upgrade on partner lobby cafe.',
    options: ['Hotel booking upgrade on partner lobby cafe'],
    iconName: 'Compass'
  }
];
