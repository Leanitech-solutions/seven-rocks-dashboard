import { pgTable, text, timestamp, varchar, integer, boolean, numeric, uuid, date, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // Optional for pending invites
  role: text("role").default("tenant").notNull(), // 'super_admin' | 'admin' | 'tenant'
  fullName: text("full_name").notNull(),
  status: text("status").default("active"), // 'active' | 'pending'
  onboardingToken: text("onboarding_token"),
  onboardingTokenExpiresAt: timestamp("onboarding_token_expires_at"),
  department: json("department").$type<string[]>().default([]), // e.g. ['housekeeping','maintenance','addons','tenants','notifications']
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // References Better Auth user ID
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  roomNumber: text("room_number"),
  propertyType: text("property_type"),
  propertyLocation: text("property_location"),
  leaseStart: date("lease_start"),
  leaseEnd: date("lease_end"),
  contractLengthMonths: integer("contract_length_months"),
  rentAmount: numeric("rent_amount"),
  depositAmount: numeric("deposit_amount"),
  depositStatus: text("deposit_status").default("Pending"), // Pending, Paid, Refunded
  oneTimeAdminFee: numeric("one_time_admin_fee").default("90"),
  hasExtraPerson: boolean("has_extra_person").default(false),
  status: text("status").default("pending"), // pending, active, checked_out
  idVerificationStatus: text("id_verification_status").default("pending"), // pending, verified, rejected
  idDocumentUrl: text("id_document_url"),
  contractUrl: text("contract_url"),
  contractVerified: boolean("contract_verified").default(false),
  verificationChecklist: json("verification_checklist").$type<any>(),
  activeAddOns: json("active_add_ons").$type<string[]>().default([]),
  passwordHash: text("password_hash"),
  onboardingToken: text("onboarding_token"),
  onboardingTokenExpiresAt: timestamp("onboarding_token_expires_at"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const maintenanceTickets = pgTable("maintenance_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("Medium"), // Low, Medium, High
  status: text("status").default("Open"), // Open, In Progress, Resolved, Closed
  mediaUrls: json("media_urls"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const housekeepingRequests = pgTable("housekeeping_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  date: date("date").notNull(),
  timeSlot: text("time_slot"), // made nullable since UI doesn't have it currently
  status: text("status").default("Pending"), // Pending, Approved, Completed, Cancelled
  frequency: text("frequency").default("Single Use"), // Single Use, Bi-Weekly, Monthly
  priceValue: numeric("price_value").default("40"),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const addOnServices = pgTable("add_on_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price").notNull(),   // numeric value e.g. 30
  priceLabel: text("price_label"),     // display string e.g. "€30/Mo"
  type: text("type").notNull(),        // One-Time, Subscription
  category: text("category").default("other"), // fitness, kits, utilities, other
  iconName: text("icon_name").default("Sparkles"), // Dumbbell | Sparkles | CookingPot | WashingMachine | Compass | ShoppingBag
  badge: text("badge"),                // Optional badge text e.g. "Popular"
  options: json("options").$type<string[]>().default([]), // price tier options
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const addOnRequests = pgTable("add_on_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  serviceId: uuid("service_id").references(() => addOnServices.id),
  status: text("status").default("Pending"), // Pending, Approved, Rejected, Completed
  paymentStatus: text("payment_status").default("Unpaid"), // Unpaid, Paid
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  amount: numeric("amount").notNull(),
  status: text("status").default("Pending"), // Pending, Paid, Overdue
  dueDate: date("due_date").notNull(),
  type: text("type").notNull(), // Rent, Add-On, Maintenance, Deposit
  description: text("description"),
  // Invoice breakdown fields
  rentAmount: numeric("rent_amount"),
  extraPersonSurcharge: numeric("extra_person_surcharge").default("0"),
  addOnTotal: numeric("add_on_total").default("0"),
  adminFee: numeric("admin_fee").default("0"),
  depositAmount: numeric("deposit_amount").default("0"),
  subtotal: numeric("subtotal"),
  vatRate: numeric("vat_rate").default("10"),
  vatAmount: numeric("vat_amount"),
  // Payment info
  paymentMethod: text("payment_method"),
  paymentDate: date("payment_date"),
  paymentChannel: text("payment_channel"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inspections = pgTable("inspections", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  type: text("type").notNull(), // Check-In, Check-Out, Routine
  notes: text("notes"),
  status: text("status").default("Pending"), // Pending, Completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventoryPhotos = pgTable("inventory_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  inspectionId: uuid("inspection_id").references(() => inspections.id),
  photoUrl: text("photo_url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  targetAudience: text("target_audience").notNull(), // 'All Tenants', 'Specific Building', 'Specific Tenant', 'Bulk Tenants'
  targetValue: text("target_value"),
  sentAt: timestamp("sent_at").defaultNow(),
  readCount: integer("read_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  timestamp: timestamp("timestamp").defaultNow(),
  type: text("type").notNull(), // 'tenant' | 'billing' | 'ticket' | 'notification' | 'addon'
  user: text("user").notNull(),
  action: text("action").notNull(),
  details: text("details"),
});

export const policies = pgTable("policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
});

export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  lockSingleUseTermsTo6Months: boolean("lock_single_use_terms").default(true),
  requiresNotice24To48Hours: boolean("requires_notice").default(true),
  enforceGdprAnonymization: boolean("enforce_gdpr").default(true),
  enableTwoFactorAuthLock: boolean("enable_2fa").default(false),
  pricingTiers: json("pricing_tiers").$type<{
    extraPersonSurcharge: number;
    oneTimeAdminFee: number;
    housekeepingMonthly: number;
    housekeepingBiWeekly: number;
    housekeepingSingle: number;
  }>(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contractExtensionRequests = pgTable("contract_extension_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  currentEndDate: date("current_end_date").notNull(),
  requestedDurationMonths: integer("requested_duration_months").notNull(),
  newEndDate: date("new_end_date").notNull(),
  status: text("status").default("Pending"), // Pending, Approved, Rejected
  notes: text("notes"),
  requestDate: timestamp("request_date").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const tenantRelations = relations(tenants, ({ many }) => ({
  maintenanceTickets: many(maintenanceTickets),
  housekeepingRequests: many(housekeepingRequests),
  addOnRequests: many(addOnRequests),
  invoices: many(invoices),
  inspections: many(inspections),
  contractExtensionRequests: many(contractExtensionRequests),
}));
