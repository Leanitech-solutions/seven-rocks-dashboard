export type TenantStatus = 'Checked-In' | 'Pending' | 'Checked-Out';

export interface InventoryItem {
  name: string;
  quantity: number;
  condition: 'Good' | 'Fair' | 'Needs Replacement';
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone: string;
  roomNumber: string;
  building: string;
  status: TenantStatus;
  contractStartDate: string;
  contractEndDate: string;
  contractLengthMonths: number; // calculated contract length
  idDocumentUrl: string; // mock document
  contractFileName?: string; // uploaded contract file
  hasExtraPerson: boolean; // extra person surcharge (€85/mo)
  extraPersonName?: string;
  depositStatus: 'Paid' | 'Unpaid' | 'Refunded' | 'Pending';
  depositAmount: number; // 1.5 months rent for <6mo, 2 months for >6mo
  monthlyRent: number;
  oneTimeAdminFee: number; // €90.00
  activeAddOns: string[]; // list of add-on names
  idDocumentVerified?: boolean;
  contractVerified?: boolean;
  additionalDocs?: { name: string; uploadedAt: string; size?: string }[];
  propertyType?: string;
  propertyLocation?: string;
  checkInImages?: string[]; // check-in inspection images (data URLs or remote URLs)
  checkOutImages?: string[]; // check-out inspection images (data URLs or remote URLs)
  inventoryItems?: InventoryItem[]; // list of inventory items
  verificationChecklist?: TenantVerificationChecklist;
}

export interface VerificationCheckpoint {
  status: 'Pending' | 'Approved';
  approvedBy?: string;
  approvedAt?: string;
}

export interface TenantVerificationChecklist {
  rentReceived: VerificationCheckpoint;
  securityDeposit: VerificationCheckpoint;
  adminFee: VerificationCheckpoint;
  finalDeparture: VerificationCheckpoint;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  targetAudience: 'All Tenants' | 'Specific Building' | 'Specific Tenant' | 'Bulk Tenants';
  targetValue?: string; // building name or tenant name/id
  sentAt: string;
  readCount: number;
  deliveredCount: number;
}

export interface AddOnRequest {
  id: string;
  tenantId: string;
  serviceId?: string;  // DB foreign key to add_on_services
  tenantName: string;
  roomNumber: string;
  building: string;
  category: 'Fitness & Wellness' | 'Equipment Kits' | 'Utilities' | 'Other' | 'Hotel Booking';
  serviceName: string;
  priceDetails: string;
  priceValue: number;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  paymentOption?: 'Pay at Desk' | 'Request Invoice (Pay at Desk)' | 'Monthly Statement Billing';
  paymentStatus?: 'Paid' | 'Unpaid';
  paymentMethod?: string;
  paymentDate?: string;
  paymentChannel?: 'Online' | 'Desk';
}

export interface HousekeepingRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  building: string;
  scheduleDate: string;
  requestedAt: string;
  frequency: 'Monthly' | 'Bi-Weekly' | 'Single Use';
  priceValue: number; // €140/mo, €120/mo, or €40/use
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
}

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved';
export type TicketPriority = 'Low' | 'Medium' | 'High';

export interface SupportTicket {
  id: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  building: string;
  category: 'Plumbing' | 'Electrical' | 'Internet/Wi-Fi' | 'Appliance' | 'Key/Access' | 'Other';
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  building: string;
  date: string;
  dueDate: string;
  rentAmount: number;
  extraPersonSurcharge: number; // €85 if hasExtraPerson is true
  addOnTotal: number;
  adminFee: number; // €90 if applicable (first month)
  depositAmount: number; // deposit amount if first month
  subtotal: number;
  vatRate: number; // standard e.g. 10% for housing, or 21% for services
  vatAmount: number;
  totalAmount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  paymentMethod?: string;
  paymentDate?: string;
  invoiceFileName?: string; // uploaded invoice file
  paymentChannel?: 'Online' | 'Desk';
  type?: string;
  description?: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'tenant' | 'billing' | 'ticket' | 'notification' | 'addon';
  user: string;
  action: string;
  details?: string;
}

export interface PolicyFAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface AppSettings {
  lockSingleUseTermsTo6Months: boolean;
  requiresNotice24To48Hours: boolean;
  enforceGdprAnonymization: boolean;
  enableTwoFactorAuthLock: boolean;
  pricingTiers: {
    extraPersonSurcharge: number;
    oneTimeAdminFee: number;
    housekeepingMonthly: number;
    housekeepingBiWeekly: number;
    housekeepingSingle: number;
  };
}

export interface AddOnService {
  id: string;
  category: 'fitness' | 'kits' | 'utilities' | 'other';
  name: string;
  price: string;
  priceVal: number;
  desc: string;
  options: string[];
  iconName: 'Dumbbell' | 'Sparkles' | 'CookingPot' | 'WashingMachine' | 'Compass' | 'ShoppingBag';
  badge?: string;
}

export interface ContractExtensionRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  building: string;
  currentEndDate: string;
  requestedDurationMonths: number;
  newEndDate: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
}

