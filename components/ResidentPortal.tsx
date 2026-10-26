import { useState, FormEvent, useEffect } from 'react';
import { useToast } from '../lib/useToast';
import { useDialog } from '../lib/useDialog';
import { formatId } from '../lib/formatId';
import { 
  User, 
  Building,
  Building2, 
  Calendar, 
  CreditCard, 
  Coins, 
  Dumbbell, 
  Sparkles, 
  Wrench, 
  Brush, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  HelpCircle, 
  LogOut, 
  ArrowRight,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
  Receipt,
  FileText,
  Menu,
  X,
  Camera,
  Clock,
  Bell
} from 'lucide-react';
import { 
  Tenant, 
  AddOnRequest, 
  HousekeepingRequest, 
  SupportTicket, 
  Invoice, 
  Notification, 
  AppSettings,
  AddOnService,
  ContractExtensionRequest,
  PolicyFAQ
} from '../types';
import { SevenRocksLogo } from './SevenRocksLogo';
import { FEATURES } from '../lib/features';

interface ResidentPortalProps {
  tenant: Tenant;
  addOnRequests: AddOnRequest[];
  catalogItems?: AddOnService[];
  housekeepings: HousekeepingRequest[];
  tickets: SupportTicket[];
  invoices: Invoice[];
  notifications: Notification[];
  settings: AppSettings;
  onLogout: () => void;
  
  // Callback handlers to update global states
  onAddAddOnRequest: (newReq: AddOnRequest) => void;
  onDeleteAddOnRequest?: (reqId: string) => void;
  onAddHousekeeping: (newHkp: HousekeepingRequest) => void;
  onDeleteHousekeeping?: (reqId: string) => void;
  onAddTicket: (newTck: SupportTicket) => void;
  onPayInvoice: (invoiceId: string, paymentMethod: string) => void;
  onUpdateTenant?: (updated: Tenant) => void;
  extensionRequests?: ContractExtensionRequest[];
  onAddExtensionRequest?: (newReq: ContractExtensionRequest) => void;
  policies?: PolicyFAQ[];
}

export default function ResidentPortal({
  tenant,
  addOnRequests,
  catalogItems = [],
  housekeepings,
  tickets,
  invoices,
  notifications,
  settings,
  onLogout,
  onAddAddOnRequest,
  onDeleteAddOnRequest,
  onAddHousekeeping,
  onDeleteHousekeeping,
  onAddTicket,
  onPayInvoice,
  onUpdateTenant,
  extensionRequests = [],
  onAddExtensionRequest,
  policies = []
}: ResidentPortalProps) {
  const { showToast, ToastElement } = useToast();
  const { confirmDialog, DialogElement } = useDialog();
  const [activeTab, setActiveTab] = useState<'overview' | 'addons' | 'housekeeping' | 'billing' | 'support' | 'policies'>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- Login Alert Notification state ---
  const [loginAlertNotification, setLoginAlertNotification] = useState<Notification | null>(null);

  // --- Terms & Policies state ---
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  const [policySearch, setPolicySearch] = useState('');
  const [activePolicyCategory, setActivePolicyCategory] = useState<'all' | 'house_rules' | 'billing' | 'checkin_checkout' | 'legal'>('all');
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

  // Success alert states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedInspectionImage, setSelectedInspectionImage] = useState<string | null>(null);

  // --- Add-ons request form states ---
  const [selectedAddOnId, setSelectedAddOnId] = useState<string>('cat-fit-1');
  const [confirmAddOnItem, setConfirmAddOnItem] = useState<any | null>(null);

  // --- Housekeeping request form states ---
  const [hkDate, setHkDate] = useState('');
  const [hkFrequency, setHkFrequency] = useState<'Monthly' | 'Bi-Weekly' | 'Single Use'>('Single Use');
  const [hkNotes, setHkNotes] = useState('');
  const [hkNoticeWarning, setHkNoticeWarning] = useState<string | null>(null);

  // --- Support ticket form states ---
  const [tckCategory, setTckCategory] = useState<'Plumbing' | 'Electrical' | 'Internet/Wi-Fi' | 'Appliance' | 'Key/Access' | 'Other'>('Plumbing');
  const [tckSubject, setTckSubject] = useState('');
  const [tckPriority, setTckPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [tckDesc, setTckDesc] = useState('');

  // --- Stay Extension Form States ---
  const [extMonths, setExtMonths] = useState<number>(3);
  const [extNotes, setExtNotes] = useState<string>('');

  // --- Desk payment modal ---
  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Early departure modal
  const [showDepartureModal, setShowDepartureModal] = useState(false);
  const [departureDate, setDepartureDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [departureReason, setDepartureReason] = useState('');

  // Dynamic pricing catalogs (prepopulated with passed list)
  const CATALOG_ITEMS = catalogItems.length > 0 ? catalogItems : [];

  // Helper trigger success alert
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4500);
  };

  const handleRequestExtension = (months: number, notes: string) => {
    if (!onAddExtensionRequest) {
      showToast('Extension request service is initializing, please try again.', 'error');
      return;
    }
    
    const currentEndDateStr = tenant.contractEndDate; // e.g. "2027-01-09"
    let newEndDateStr = currentEndDateStr;
    
    try {
      const parts = currentEndDateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parts[2];
        
        let newMonth = month + months;
        let newYear = year;
        while (newMonth > 12) {
          newMonth -= 12;
          newYear += 1;
        }
        
        const mStr = String(newMonth).padStart(2, '0');
        newEndDateStr = `${newYear}-${mStr}-${day}`;
      }
    } catch (e) {
      newEndDateStr = "2027-07-09";
    }

    // 1. Submit priority Support Ticket per docx specifications
    const ticketId = `TCK-${Math.floor(100 + Math.random() * 900)}`;
    const newTicket: SupportTicket = {
      id: ticketId,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      building: tenant.building,
      category: 'Other',
      priority: 'High',
      status: 'Open',
      subject: `Stay Extension Request: +${months} Months (New End: ${newEndDateStr})`,
      description: `Resident ${tenant.name} requested a stay extension of ${months} months.\nCurrent Lease End Date: ${currentEndDateStr}\nRequested New End Date: ${newEndDateStr}\nResident Notes: ${notes.trim() || 'No additional notes provided.'}\n\n[Staff Action]: Review approval outside portal and prepare extension document via Internal Document Generator.`,
      createdAt: new Date().toISOString()
    };
    onAddTicket(newTicket);

    const newReq: ContractExtensionRequest = {
      id: `EXT-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      building: tenant.building,
      currentEndDate: currentEndDateStr,
      requestedDurationMonths: months,
      newEndDate: newEndDateStr,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      notes: notes.trim() || undefined
    };

    onAddExtensionRequest(newReq);
    triggerSuccess(`Your stay extension request (+${months} mo) has been submitted via Support Ticket #${ticketId}. Operations will review your request and prepare contract documentation.`);
    setExtNotes('');
  };

  const handleRequestEarlyDeparture = (e: FormEvent) => {
    e.preventDefault();
    const ticketId = `TCK-${Math.floor(100 + Math.random() * 900)}`;
    const newTicket: SupportTicket = {
      id: ticketId,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      building: tenant.building,
      category: 'Other',
      priority: 'High',
      status: 'Open',
      subject: `Early Departure / Cancellation Request (Target: ${departureDate})`,
      description: `Resident ${tenant.name} has submitted an early departure / cancellation request.\nTarget Move-Out Date: ${departureDate}\nScheduled Lease End Date: ${tenant.contractEndDate}\nReason: ${departureReason.trim() || 'No reason provided.'}\n\n[Staff Action]: Review outside portal, conduct move-out inspection, and update departure clearance in Staff Verification Checklist.`,
      createdAt: new Date().toISOString()
    };
    onAddTicket(newTicket);
    triggerSuccess(`Early departure request submitted via Support Ticket #${ticketId}. Management will review and contact you.`);
    setShowDepartureModal(false);
    setDepartureReason('');
  };

  // --- Action Submissions ---

  const handleOpenConfirmModal = (item: any) => {
    // Check if tenant already has this add-on active
    const formatStr = `${item.name} (${item.price})`;
    if (tenant.activeAddOns.includes(formatStr)) {
      showToast(`You already have an active subscription to ${item.name}.`, 'info');
      return;
    }

    // Check if there is already a pending request for this item
    const hasPending = addOnRequests.some(
      r => r.tenantId === tenant.id && r.serviceName === item.name && r.status === 'Pending'
    );
    if (hasPending) {
      showToast(`You already have a pending request for ${item.name} awaiting approval.`, 'info');
      return;
    }

    setConfirmAddOnItem(item);
  };

  const handleConfirmAddOnSubmit = () => {
    if (!confirmAddOnItem) return;
    const item = confirmAddOnItem;

    const newRequest: AddOnRequest = {
      id: `REQ-${Math.floor(600 + Math.random() * 399)}`,
      tenantId: tenant.id,
      serviceId: item.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      building: tenant.building,
      category: item.category === 'fitness' ? 'Fitness & Wellness' : 
                item.category === 'kits' ? 'Equipment Kits' : 
                item.category === 'utilities' ? 'Utilities' : 'Other',
      serviceName: item.name,
      priceDetails: item.price || String(item.priceVal),
      priceValue: item.priceVal,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      paymentOption: FEATURES.residentBilling ? 'Request Invoice (Pay at Desk)' : 'Monthly Statement Billing'
    };

    onAddAddOnRequest(newRequest);
    setConfirmAddOnItem(null);
    triggerSuccess(
      FEATURES.residentBilling
        ? `Invoice requested for "${item.name}"! Your request has been submitted for front desk approval.`
        : `Service request for "${item.name}" submitted! Management will review and include in your monthly statement.`
    );
  };

  const handleHkDateChange = (val: string) => {
    setHkDate(val);
    if (!val) {
      setHkNoticeWarning(null);
      return;
    }

    // Validation warning calculation: Compare chosen date against "2026-07-09"
    const today = new Date("2026-07-09T00:00:00");
    const chosen = new Date(val + "T00:00:00");
    const diffMs = chosen.getTime() - today.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));

    if (hours < 0) {
      setHkNoticeWarning("You cannot schedule cleaning in the past!");
    } else if (hours < 24) {
      setHkNoticeWarning("⚠️ Less than 24 hours warning: This booking violates the operations notice policy. Staff authorization will be flagged.");
    } else if (hours < 48) {
      setHkNoticeWarning("⚠️ Notice window is between 24-48 hours. Subject to agency availability.");
    } else {
      setHkNoticeWarning(null);
    }
  };

  const handleHousekeepingSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!hkDate) {
      showToast('Please select a date for the sanitation service.', 'error');
      return;
    }

    const today = new Date("2026-07-09T00:00:00");
    const chosen = new Date(hkDate + "T00:00:00");
    if (chosen.getTime() < today.getTime()) {
      showToast('Sanitation booking cannot be set for a past date.', 'error');
      return;
    }

    // Determine price based on frequency
    let price = 40.00;
    if (hkFrequency === 'Monthly') price = 140.00;
    if (hkFrequency === 'Bi-Weekly') price = 120.00;

    const newHkp: HousekeepingRequest = {
      id: `HKP-${Math.floor(400 + Math.random() * 599)}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      building: tenant.building,
      scheduleDate: hkDate,
      requestedAt: "2026-07-09",
      frequency: hkFrequency,
      priceValue: price,
      status: 'Scheduled',
      notes: hkNotes || undefined
    };

    onAddHousekeeping(newHkp);
    triggerSuccess(`Success! Cleaning service scheduled on ${hkDate} (${hkFrequency} - €${price}).`);
    setHkDate('');
    setHkNotes('');
    setHkNoticeWarning(null);
  };

  const handleCancelHousekeeping = (id: string, frequency: string) => {
    confirmDialog(
      "Cancel Cleaning Booking",
      `Are you sure you want to cancel your ${frequency} cleaning request?`
    ).then(confirmed => {
      if (confirmed) {
        if (onDeleteHousekeeping) {
          onDeleteHousekeeping(id);
          triggerSuccess("Your cleaning booking has been cancelled.");
        }
      }
    });
  };

  const handleTicketSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!tckSubject.trim() || !tckDesc.trim()) {
      showToast('Please fill in the ticket subject and description.', 'error');
      return;
    }

    const newTck: SupportTicket = {
      id: `TCK-${Math.floor(2000 + Math.random() * 7999)}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      building: tenant.building,
      category: tckCategory,
      subject: tckSubject,
      description: tckDesc,
      priority: tckPriority,
      status: 'Open',
      createdAt: "2026-07-09"
    };

    onAddTicket(newTck);
    triggerSuccess(`Support Ticket ${newTck.id} raised successfully! Staff has been alerted.`);
    setTckSubject('');
    setTckDesc('');
  };

  const handlePayInvoiceSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!checkoutInvoice) return;

    setPaymentProcessing(true);

    setTimeout(() => {
      setPaymentProcessing(false);
      onPayInvoice(checkoutInvoice.id, 'Desk Settlement / Requested Invoice');
      const invId = checkoutInvoice.id;
      setCheckoutInvoice(null);
      triggerSuccess(`Desk invoice request logged! Invoice ${invId} marked for front desk settlement.`);
    }, 400);
  };

  // Filter datasets belonging to this tenant
  const tenantAddOnRequests = addOnRequests.filter(r => r.tenantId === tenant.id || r.tenantName === tenant.name);
  const tenantHousekeepings = housekeepings.filter(h => h.tenantId === tenant.id || h.tenantName === tenant.name);
  const tenantTickets = tickets.filter(t => t.tenantId === tenant.id || t.tenantName === tenant.name);
  const tenantInvoices = invoices.filter(i => i.tenantId === tenant.id || i.tenantName === tenant.name);

  // Relevant announcements target audience matching
  const matchingNotifications = notifications.filter(n => {
    if (n.targetAudience === 'All Tenants') return true;
    if (n.targetAudience === 'Specific Building' && n.targetValue === tenant.building) return true;
    if (n.targetAudience === 'Specific Tenant' && n.targetValue === tenant.name) return true;
    if (n.targetAudience === 'Bulk Tenants' && n.targetValue && n.targetValue.split(',').includes(tenant.id)) return true;
    return false;
  });

  // Trigger alert message modal on login if there's a new matching notification
  useEffect(() => {
    if (matchingNotifications.length > 0) {
      try {
        const readIds: string[] = JSON.parse(localStorage.getItem(`seven_rocks_read_notifs_${tenant.id}`) || '[]');
        // Find the latest matching notification that hasn't been read/seen yet
        const unread = matchingNotifications.find(n => !readIds.includes(n.id));
        if (unread) {
          setLoginAlertNotification(unread);
        }
      } catch (e) {
        console.error("Failed to parse read notifications from localStorage", e);
      }
    }
  }, [tenant.id, matchingNotifications.length]);

  const handleAcknowledgeNotification = (id: string) => {
    try {
      const readIds: string[] = JSON.parse(localStorage.getItem(`seven_rocks_read_notifs_${tenant.id}`) || '[]');
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(`seven_rocks_read_notifs_${tenant.id}`, JSON.stringify(readIds));
      }
    } catch (e) {
      console.error("Failed to write read notifications to localStorage", e);
    }
    setLoginAlertNotification(null);
  };

  const pendingInvoices = tenantInvoices.filter(i => i.status !== 'Paid');
  const totalOutstanding = pendingInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const isAwaitingAssignment = !tenant.roomNumber || tenant.roomNumber === 'Awaiting Assignment';

  return (
    <div className="flex flex-col h-screen w-screen bg-brand-bg text-brand-dark overflow-hidden font-sans">
      {ToastElement}
      <DialogElement />

      {/* 1. Header Banner */}
      <header className="bg-white border-b border-brand-border px-4 md:px-8 py-4 md:py-5 flex items-center justify-between shrink-0 shadow-xs z-10">
        
        <div className="flex items-center min-w-0">
          {/* Mobile hamburger menu button */}
          {!isAwaitingAssignment && (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-brand-secondary hover:text-brand-primary hover:bg-brand-surface rounded-xl border border-brand-border cursor-pointer mr-3 shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="h-9 w-9 rounded-xl bg-brand-surface text-brand-primary flex items-center justify-center border border-brand-border p-1.5 shrink-0 hidden sm:flex">
            <SevenRocksLogo className="h-full w-full text-brand-primary" />
          </div>
          <div className="sm:ml-3 min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm md:text-lg font-bold text-brand-dark font-serif truncate">Seven Rocks Resident Portal</h2>
              <span className={`text-[9px] md:text-[10px] border px-1.5 md:px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                isAwaitingAssignment 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-brand-surface text-brand-primary border-brand-border'
              }`}>
                {isAwaitingAssignment ? 'Awaiting Allocation' : 'Active'}
              </span>
            </div>
            <p className="text-[10px] md:text-xs text-brand-secondary font-medium truncate">
              Suite: <strong className="text-brand-dark">{tenant.roomNumber || 'Awaiting Room Assignment'}</strong> • {tenant.building || 'Awaiting Location Allocation'}
            </p>
          </div>
        </div>

        {/* Navigation Tab Bar Controls (Desktop Only) */}
        {!isAwaitingAssignment && (
          <div className="hidden lg:flex space-x-1.5 bg-brand-surface border border-brand-border/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview' ? 'bg-brand-primary text-white' : 'text-brand-secondary hover:text-brand-dark'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('addons')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'addons' ? 'bg-brand-primary text-white' : 'text-brand-secondary hover:text-brand-dark'
              }`}
            >
              Add-ons
            </button>
            <button
              onClick={() => setActiveTab('housekeeping')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'housekeeping' ? 'bg-brand-primary text-white' : 'text-brand-secondary hover:text-brand-dark'
              }`}
            >
              Housekeeping
            </button>
            {FEATURES.residentBilling && (
              <button
                onClick={() => setActiveTab('billing')}
                className={`px-4 py-2 rounded-lg text-xs font-bold relative transition-all cursor-pointer ${
                  activeTab === 'billing' ? 'bg-brand-primary text-white' : 'text-brand-secondary hover:text-brand-dark'
                }`}
              >
                <span>Billing</span>
                {pendingInvoices.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab('support')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'support' ? 'bg-brand-primary text-white' : 'text-brand-secondary hover:text-brand-dark'
              }`}
            >
              Support Tickets
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                activeTab === 'policies' ? 'bg-brand-primary text-white' : 'text-brand-secondary hover:text-brand-dark'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Terms & Policies</span>
            </button>
          </div>
        )}

        {/* User profile logout controls */}
        <div className="flex items-center space-x-3 md:space-x-4 shrink-0">
          <div className="text-right hidden md:block">
            <span className="block text-xs font-bold text-brand-dark">{tenant.name}</span>
            <span className="block text-[10px] text-brand-stone font-mono">{tenant.email}</span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 md:p-2.5 rounded-xl border border-brand-border bg-brand-surface hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-brand-secondary shrink-0"
            title="Log out of Portal"
          >
            <LogOut className="h-4 md:h-4.5 w-4 md:w-4.5" />
          </button>
        </div>

      </header>

      {/* 1b. Mobile Navigation Sidebar Overlay for Resident Portal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-64 bg-white h-full shadow-2xl relative flex flex-col animate-slide-left">
            {/* Header */}
            <div className="p-6 border-b border-brand-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-brand-surface text-brand-primary p-2 rounded-xl flex items-center justify-center border border-brand-border">
                  <SevenRocksLogo className="h-5 w-5 text-brand-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-serif text-brand-primary leading-tight font-bold">Seven Rocks</h1>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-brand-stone mt-0.5">Resident Portal</p>
                </div>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-2 text-brand-stone hover:text-brand-dark cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Resident Info Box in Sidebar */}
            <div className="p-4 border-b border-brand-border bg-[#FAF9F6]">
              <p className="text-xs font-bold text-brand-dark">{tenant.name}</p>
              <p className="text-[10px] text-brand-stone font-mono mt-0.5 truncate">{tenant.email}</p>
              <p className="text-[10px] text-brand-secondary font-semibold mt-1">
                Suite: {tenant.roomNumber || 'Awaiting Room'}
              </p>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <button
                onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'overview' ? 'bg-brand-surface text-brand-primary border border-brand-border' : 'text-brand-secondary hover:bg-brand-bg hover:text-brand-dark'
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>Dashboard Overview</span>
              </button>

              <button
                onClick={() => { setActiveTab('addons'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'addons' ? 'bg-brand-surface text-brand-primary border border-brand-border' : 'text-brand-secondary hover:bg-brand-bg hover:text-brand-dark'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>Add-ons</span>
              </button>

              <button
                onClick={() => { setActiveTab('housekeeping'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'housekeeping' ? 'bg-brand-surface text-brand-primary border border-brand-border' : 'text-brand-secondary hover:bg-brand-bg hover:text-brand-dark'
                }`}
              >
                <Brush className="h-4 w-4" />
                <span>Housekeeping</span>
              </button>

              {FEATURES.residentBilling && (
                <button
                  onClick={() => { setActiveTab('billing'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'billing' ? 'bg-brand-surface text-brand-primary border border-brand-border' : 'text-brand-secondary hover:bg-brand-bg hover:text-brand-dark'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Receipt className="h-4 w-4" />
                    <span>Billing & Invoices</span>
                  </div>
                  {pendingInvoices.length > 0 && (
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                  )}
                </button>
              )}

              <button
                onClick={() => { setActiveTab('support'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'support' ? 'bg-brand-surface text-brand-primary border border-brand-border' : 'text-brand-secondary hover:bg-brand-bg hover:text-brand-dark'
                }`}
              >
                <Wrench className="h-4 w-4" />
                <span>Support Tickets</span>
              </button>

              <button
                onClick={() => { setActiveTab('policies'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'policies' ? 'bg-brand-surface text-brand-primary border border-brand-border' : 'text-brand-secondary hover:bg-brand-bg hover:text-brand-dark'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Terms & Policies</span>
              </button>
            </nav>

            {/* Logout Footer inside Mobile Drawer */}
            <div className="p-4 border-t border-brand-border bg-brand-bg/30">
              <button
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out of Portal</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* 2. Success Alert Notification Toast */}
      {successMessage && (
        <div className="bg-brand-primary text-white px-8 py-3 flex items-center justify-between shadow-brand z-50 animate-fade-in shrink-0 border-b border-brand-primary/20">
          <div className="flex items-center space-x-3 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4 text-[#F5F5F0]" />
            <span>{successMessage}</span>
          </div>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="text-white/60 hover:text-white font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Primary Workspace Screen Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#FAF9F6]">
        
        {isAwaitingAssignment ? (
          /* Custom Onboarding/Wait screen for unallocated tenants */
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-6">
            
            {/* Greeting status card */}
            <div className="relative">
              {/* Solid shadow layer as a background */}
              <div className="absolute inset-0 bg-brand-primary/10 rounded-3xl translate-x-2 translate-y-2"></div>
              
              <div className="relative bg-brand-surface text-brand-dark p-8 rounded-3xl border border-brand-stone/60 space-y-4 overflow-hidden">
                <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-brand-primary/5 blur-3xl pointer-events-none" />
                <div className="space-y-2 z-10 relative">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-brand-bg text-natural-dark-olive border border-brand-stone/30 tracking-wider uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
                    Suite Assignment Pending
                  </span>
                  <h3 className="text-2xl font-serif font-bold text-natural-dark-olive">Welcome to Seven Rocks, {tenant.name}</h3>
                  <p className="text-xs text-brand-secondary leading-relaxed max-w-xl font-medium">
                    Your registration is complete and your ID document has been securely uploaded to our compliance vault. 
                    Our operations team has been notified and is currently allocating your premium room and unit number.
                  </p>
                </div>
              </div>
            </div>

            {/* Step Onboarding Tracker */}
            <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs space-y-6">
              <h4 className="font-bold text-brand-dark text-xs uppercase tracking-widest border-b border-brand-border pb-3 font-serif italic">
                Your Co-Living Onboarding Journey
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                {/* Step 1 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px] font-bold shadow-brand">
                      ✓
                    </div>
                    <span className="text-xs font-bold text-brand-dark">1. Apply Online</span>
                  </div>
                  <p className="text-[10px] text-brand-secondary leading-relaxed font-medium">
                    Contact credentials logged in system.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px] font-bold shadow-brand">
                      ✓
                    </div>
                    <span className="text-xs font-bold text-brand-dark">2. Upload ID</span>
                  </div>
                  <p className="text-[10px] text-brand-secondary leading-relaxed font-medium truncate">
                    Uploaded file <code className="font-mono text-[9px] bg-brand-surface border px-1 rounded text-brand-primary">{tenant.idDocumentUrl}</code>
                  </p>
                </div>

                {/* Step 3 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold animate-pulse">
                      3
                    </div>
                    <span className="text-xs font-bold text-brand-dark">3. Unit Assignment</span>
                  </div>
                  <p className="text-[10px] text-brand-secondary leading-relaxed font-medium">
                    Awaiting staff to specify building & suite number.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-brand-surface text-brand-stone border border-brand-border flex items-center justify-center text-[10px] font-bold">
                      4
                    </div>
                    <span className="text-xs font-bold text-brand-stone">
                      {FEATURES.residentBilling ? '4. Pay Escrow' : '4. Check-in Verification'}
                    </span>
                  </div>
                  <p className="text-[10px] text-brand-stone leading-relaxed font-medium">
                    {FEATURES.residentBilling 
                      ? 'Settle move-in invoice and deposit to unlock smart-key.'
                      : 'Front desk completes verification of credentials to unlock smart-key.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Informative details */}
            <div className="bg-brand-surface/50 border border-brand-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-brand-primary" />
                <h4 className="font-bold text-brand-dark text-xs uppercase tracking-wider">Premium Co-Living Amenities</h4>
              </div>
              <p className="text-xs text-brand-secondary leading-relaxed font-medium">
                Seven Rocks co-living stays include complimentary high-performance gym membership, wellness suites (saunas & steam rooms), high-speed fiber internet, and biometric smart-keys.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 bg-white border border-brand-border rounded-xl flex items-center space-x-2.5">
                  <span className="h-2 w-2 rounded-full bg-brand-primary" />
                  <span className="font-semibold text-brand-dark">Preferred Building: {tenant.building || 'Berlin Mitte Central'}</span>
                </div>
                <div className="p-3 bg-white border border-brand-border rounded-xl flex items-center space-x-2.5">
                  <span className="h-2 w-2 rounded-full bg-brand-primary" />
                  <span className="font-semibold text-brand-dark">Lease Length: {tenant.contractLengthMonths} Months Stay</span>
                </div>
              </div>
            </div>

            {/* Terms & Conditions preview for awaiting assignment tenants */}
            <div className="bg-[#DED9CF]/30 border border-[#DED9CF] rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-white border border-[#DED9CF] rounded-xl text-brand-primary shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-dark text-xs uppercase tracking-wider">Co-Living Terms & Policies</h4>
                    <p className="text-[10px] text-brand-secondary font-semibold">Review House Rules, Escrow Security policies, and community guidelines.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPoliciesModal(true)}
                  className="px-4 py-2 bg-brand-primary hover:bg-[#4E4E37] text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-brand self-start sm:self-auto shrink-0"
                >
                  Inspect Terms & Policies
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-[10px] text-brand-stone font-bold uppercase tracking-wider">
                Please wait or contact our Berlin HQ operations if you have questions.
              </p>
            </div>
          </div>
        ) : (
          /* Normal tabbed portal layout */
          <>
            {/* --- TABS 1: OVERVIEW DASHBOARD --- */}
            {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Header Greeting Banner */}
            <div className="relative">
              {/* Solid shadow layer as a background */}
              <div className="absolute inset-0 bg-brand-primary/10 rounded-3xl translate-x-2 translate-y-2"></div>
              
              <div className="relative bg-brand-surface text-brand-dark p-8 rounded-3xl border border-brand-stone/60 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
                <div className="space-y-2 z-10">
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-natural-dark-olive">Welcome to your suite, {tenant.name}</h3>
                  <p className="text-xs text-brand-secondary leading-relaxed max-w-xl font-medium">
                    We are glad to have you checked-in at <strong className="text-brand-dark font-bold">{tenant.building}</strong>. 
                    Below are your lease terms, active luxury additions, and digital home services options.
                  </p>
                </div>

                <div className="bg-brand-bg border border-brand-stone/40 p-4 rounded-2xl shrink-0 z-10 font-mono text-right text-xs space-y-1 shadow-sm">
                  <p className="text-brand-stone font-semibold">Checked-In Date:</p>
                  <strong className="text-brand-dark font-extrabold">{tenant.contractStartDate}</strong>
                  <p className="text-brand-stone font-semibold pt-2">Contract End date:</p>
                  <strong className="text-brand-dark font-extrabold">{tenant.contractEndDate}</strong>
                </div>
              </div>
            </div>

            {/* Main grid columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Column 1 & 2: Leasehold Details & Active Services */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Leasehold Contract info */}
                <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs">
                  <h4 className="font-bold text-brand-dark text-sm font-serif italic mb-4 border-b border-brand-border pb-3 flex items-center gap-2">
                    <Building2 className="h-4.5 w-4.5 text-brand-primary" />
                    Resident Lease Details
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="bg-brand-surface p-3.5 rounded-xl border border-brand-border/60">
                      <span className="text-brand-stone font-semibold block mb-1">Monthly Base Rent</span>
                      <strong className="text-brand-dark text-base font-mono font-extrabold">€{tenant.monthlyRent.toFixed(2)}</strong>
                    </div>

                    <div className="bg-brand-surface p-3.5 rounded-xl border border-brand-border/60">
                      <span className="text-brand-stone font-semibold block mb-1">Lease Length</span>
                      <strong className="text-brand-dark text-base font-extrabold">{tenant.contractLengthMonths} Months</strong>
                    </div>

                    <div className="bg-brand-surface p-3.5 rounded-xl border border-brand-border/60">
                      <span className="text-brand-stone font-semibold block mb-1">Escrow Deposit</span>
                      <strong className="text-brand-dark text-base font-mono font-extrabold">€{tenant.depositAmount.toFixed(2)}</strong>
                      <span className="block text-[9px] text-brand-stone mt-0.5 uppercase font-bold">({tenant.depositStatus})</span>
                    </div>

                    <div className="bg-brand-surface p-3.5 rounded-xl border border-brand-border/60">
                      <span className="text-brand-stone font-semibold block mb-1">Co-Occupancy</span>
                      <strong className="text-brand-dark text-base font-extrabold">
                        {tenant.hasExtraPerson ? 'Active' : 'None'}
                      </strong>
                      <span className="block text-[9px] text-brand-stone mt-0.5 uppercase font-bold">
                        {tenant.hasExtraPerson ? '+€85/Mo Surcharge' : 'Single Occupant'}
                      </span>
                    </div>
                  </div>

                  {/* Stay Extension Request System */}
                  <div className="mt-5 pt-4 border-t border-brand-border">
                    {(() => {
                      const pendingExtension = extensionRequests.find(
                        (r) => r.tenantId === tenant.id && r.status === 'Pending'
                      );

                      if (pendingExtension) {
                        return (
                          <div className="bg-amber-50/65 border border-amber-200/80 rounded-2xl p-4.5 space-y-3">
                            <div className="flex items-start space-x-3">
                              <div className="p-2 bg-amber-100/80 rounded-xl text-amber-800 shrink-0">
                                <Clock className="h-4.5 w-4.5 animate-pulse" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <h5 className="text-xs font-bold text-amber-950">Stay Extension Request Pending</h5>
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase rounded-full border border-amber-200">
                                    Under Admin Review
                                  </span>
                                </div>
                                <p className="text-[10px] text-amber-800 mt-0.5 font-medium leading-relaxed">
                                  Submitted on {pendingExtension.requestDate}. The Seven Rocks property management team is reviewing your requested stay extension.
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-white/80 p-2.5 rounded-xl border border-amber-200 font-medium">
                              <div>
                                <span className="text-brand-stone font-semibold">Requested Stay:</span>
                                <p className="text-brand-dark font-bold">+{pendingExtension.requestedDurationMonths} Months</p>
                              </div>
                              <div>
                                <span className="text-brand-stone font-semibold">Proposed Check-out:</span>
                                <p className="text-brand-dark font-bold font-mono">{pendingExtension.newEndDate}</p>
                              </div>
                              {pendingExtension.notes && (
                                <div className="col-span-2 pt-1 border-t border-amber-100">
                                  <span className="text-brand-stone font-semibold">Your Notes:</span>
                                  <p className="text-brand-secondary italic truncate">{pendingExtension.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Dynamic date calculation
                      const getProposedEndDate = (months: number) => {
                        const currentEndDateStr = tenant.contractEndDate;
                        try {
                          const parts = currentEndDateStr.split('-');
                          if (parts.length === 3) {
                            const year = parseInt(parts[0], 10);
                            const month = parseInt(parts[1], 10);
                            const day = parts[2];
                            
                            let newMonth = month + months;
                            let newYear = year;
                            while (newMonth > 12) {
                              newMonth -= 12;
                              newYear += 1;
                            }
                            const mStr = String(newMonth).padStart(2, '0');
                            return `${newYear}-${mStr}-${day}`;
                          }
                        } catch (e) {
                          return "Calculated End Date";
                        }
                        return currentEndDateStr;
                      };

                      const proposedDate = getProposedEndDate(extMonths);

                      return (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div>
                              <h5 className="text-xs font-bold text-brand-dark">Stay Extension Request</h5>
                              <p className="text-[10px] text-brand-stone font-medium mt-0.5">
                                Select a stay extension duration between 3 Months to 1 Year. Your request will be evaluated by our property managers.
                              </p>
                            </div>
                            <span className="text-[9px] font-bold bg-brand-surface text-brand-primary px-2 py-0.5 border border-brand-border rounded-lg uppercase tracking-wide shrink-0">
                              Proposed Checkout: <span className="font-mono">{proposedDate}</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            {/* Dropdown Selector */}
                            <div className="md:col-span-5">
                              <label className="block text-[9px] font-bold text-brand-stone uppercase tracking-wide mb-1">
                                Select Extension Period
                              </label>
                              <select
                                id="extension-period-dropdown"
                                value={extMonths}
                                onChange={(e) => setExtMonths(parseInt(e.target.value, 10))}
                                className="w-full bg-white border border-brand-border rounded-xl p-2 text-xs font-semibold text-brand-dark focus:outline-none cursor-pointer focus:ring-1 focus:ring-brand-primary"
                              >
                                <option value={3}>3 Months Stay Extension</option>
                                <option value={4}>4 Months Stay Extension</option>
                                <option value={5}>5 Months Stay Extension</option>
                                <option value={6}>6 Months Stay Extension</option>
                                <option value={7}>7 Months Stay Extension</option>
                                <option value={8}>8 Months Stay Extension</option>
                                <option value={9}>9 Months Stay Extension</option>
                                <option value={10}>10 Months Stay Extension</option>
                                <option value={11}>11 Months Stay Extension</option>
                                <option value={12}>12 Months Stay Extension (1 Year)</option>
                              </select>
                            </div>

                            {/* Brief explanation or context note */}
                            <div className="md:col-span-7">
                              <label className="block text-[9px] font-bold text-brand-stone uppercase tracking-wide mb-1">
                                Message or Notes for Admin Team
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Project extended, personal relocation timing..."
                                value={extNotes}
                                onChange={(e) => setExtNotes(e.target.value)}
                                className="w-full bg-white border border-brand-border rounded-xl p-2 text-xs text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                              />
                            </div>
                          </div>

                          {/* Action submission buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-brand-border/60">
                            <button
                              type="button"
                              onClick={() => setShowDepartureModal(true)}
                              className="px-3 py-1.5 bg-brand-surface hover:bg-rose-50 text-rose-800 border border-brand-border text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                            >
                              Request Early Departure / Cancellation
                            </button>
                            <button
                              type="button"
                              id="submit-extension-request-btn"
                              onClick={() => handleRequestExtension(extMonths, extNotes)}
                              className="px-4 py-2 bg-brand-primary hover:bg-[#4E4E37] text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-brand flex items-center space-x-1.5"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-[#E5E0D8]" />
                              <span>Submit {extMonths}-Month Stay Request</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Active Services List */}
                <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs">
                  <h4 className="font-bold text-brand-dark text-sm font-serif italic mb-4 border-b border-brand-border pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-brand-primary" />
                      <span>Active Premium Amenities & Add-ons</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('addons')}
                      className="text-[10px] text-brand-primary font-bold hover:underline"
                    >
                      Browse Catalog →
                    </button>
                  </h4>

                  {tenant.activeAddOns.length === 0 ? (
                    <div className="p-8 text-center text-xs text-brand-stone italic bg-brand-surface border border-dashed border-brand-border rounded-xl">
                      No optional add-ons or kitchen kits are active currently. Subscribe in the Add-on tab.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tenant.activeAddOns.map((addonStr, i) => (
                        <div 
                          key={`act-${i}`} 
                          className="p-3 bg-brand-surface rounded-xl border border-brand-border flex items-center space-x-3 text-xs"
                        >
                          <div className="p-2 bg-white rounded-lg border border-brand-border text-brand-primary">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-brand-dark">{addonStr.split(' (')[0]}</p>
                            <p className="text-[10px] text-brand-stone font-semibold font-mono">{addonStr.substring(addonStr.indexOf('('))}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lease Contract Card */}
                <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs">
                  <h4 className="font-bold text-brand-dark text-sm font-serif italic mb-4 border-b border-brand-border pb-3 flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-brand-primary" />
                    <span>Your Signed Lease Agreement</span>
                  </h4>

                  {tenant.contractFileName ? (
                    <div className="p-4 bg-brand-surface border border-brand-border rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-brand-dark truncate">{tenant.contractFileName}</p>
                          <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 font-serif italic">
                            <ShieldCheck className="h-3.5 w-3.5" /> Fully Signed, Sealed, & Legally Bonded
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => showToast(`File preview: ${tenant.contractFileName}`, 'info')}
                        className="text-[10.5px] font-bold text-brand-secondary hover:text-brand-primary bg-white border border-brand-border px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
                      >
                        View Agreement
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-brand-stone italic bg-brand-surface border border-dashed border-brand-border rounded-xl">
                      Your signed lease agreement is currently pending file upload by Seven Rocks Administration.
                    </div>
                  )}
                </div>

                {/* Property Handover, Inspections & Inventory */}
                <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-brand-border pb-3">
                    <h4 className="font-bold text-brand-dark text-sm font-serif italic flex items-center gap-2">
                      <ClipboardList className="h-4.5 w-4.5 text-brand-primary" />
                      <span>Property Handover & Suite Inventory</span>
                    </h4>
                    <span className="text-[10.5px] bg-[#EAE8E1] border border-[#DCDAD2] text-brand-primary font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Handover Inspected
                    </span>
                  </div>

                  {/* 1. Check-In & Check-Out Inspection Images */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Check-In Images */}
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-bold text-brand-stone uppercase tracking-wider block">Check-In Inspection Photos</span>
                      {tenant.checkInImages && tenant.checkInImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {tenant.checkInImages.map((img, i) => (
                            <div 
                              key={`ch-in-${i}`}
                              onClick={() => setSelectedInspectionImage(img)}
                              className="group relative h-24 rounded-xl border border-brand-border overflow-hidden cursor-pointer hover:border-brand-primary transition-all shadow-2xs"
                            >
                              <img 
                                src={img} 
                                alt={`Check-In ${i + 1}`} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-1 rounded-md">View Photo</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-5 text-center text-xs text-brand-stone italic bg-brand-surface border border-dashed border-brand-border rounded-xl h-24 flex items-center justify-center">
                          No check-in photos available.
                        </div>
                      )}
                    </div>

                    {/* Check-Out Images */}
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-bold text-brand-stone uppercase tracking-wider block">Check-Out Inspection Photos</span>
                      {tenant.checkOutImages && tenant.checkOutImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {tenant.checkOutImages.map((img, i) => (
                            <div 
                              key={`ch-out-${i}`}
                              onClick={() => setSelectedInspectionImage(img)}
                              className="group relative h-24 rounded-xl border border-brand-border overflow-hidden cursor-pointer hover:border-brand-primary transition-all shadow-2xs"
                            >
                              <img 
                                src={img} 
                                alt={`Check-Out ${i + 1}`} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-1 rounded-md">View Photo</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-5 text-center text-xs text-brand-stone italic bg-brand-surface border border-dashed border-brand-border rounded-xl flex flex-col items-center justify-center h-24">
                          <span className="font-medium text-[11px]">Awaiting check-out inspection</span>
                          <span className="text-[9px] text-brand-stone mt-0.5">(Conducted on lease completion)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Suite Inventory Items */}
                  <div className="space-y-3 pt-3 border-t border-brand-surface">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-brand-stone uppercase tracking-wider">Suite Inventory Registry</span>
                      <span className="text-xs font-bold text-brand-primary bg-brand-surface border border-brand-border px-3 py-1 rounded-full">
                        {tenant.inventoryItems?.reduce((sum, item) => sum + item.quantity, 0) || 0} Inventory Items Available
                      </span>
                    </div>

                    {!tenant.inventoryItems || tenant.inventoryItems.length === 0 ? (
                      <p className="text-xs text-brand-stone italic py-2">No inventory registry associated with this suite.</p>
                    ) : (
                      <div className="overflow-hidden border border-brand-border rounded-xl shadow-2xs bg-[#FAF9F6]">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-brand-surface text-brand-stone font-semibold border-b border-brand-border">
                              <th className="p-3">Item Name</th>
                              <th className="p-3 w-20 text-center">Qty</th>
                              <th className="p-3 w-32 text-right">Condition Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-border font-medium text-brand-dark">
                            {tenant.inventoryItems.map((item, idx) => (
                              <tr key={`inv-${idx}`} className="hover:bg-white transition-colors">
                                <td className="p-3 font-semibold">{item.name}</td>
                                <td className="p-3 text-center font-mono text-brand-secondary">{item.quantity}</td>
                                <td className="p-3 text-right">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    item.condition === 'Good' 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                      : item.condition === 'Fair'
                                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                                      : 'bg-rose-50 border-rose-200 text-rose-800'
                                  }`}>
                                    {item.condition}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Column 3: Announcements & Notifications */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Financial Overview outstanding card */}
                {FEATURES.residentBilling && (
                  <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl space-y-3.5">
                    <span className="text-[10px] text-brand-stone font-bold uppercase tracking-wider block">Financial Summary</span>
                    <div className="flex justify-between items-baseline">
                      <h5 className="text-xs text-brand-secondary font-medium">Active Account Balance:</h5>
                      <span className="text-xl font-mono font-extrabold text-brand-dark">
                        €{totalOutstanding.toLocaleString('en-IE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {pendingInvoices.length > 0 ? (
                      <div className="p-3 bg-white border border-brand-border rounded-xl text-[10.5px] leading-relaxed flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="block text-amber-800 font-bold">Pending Statements</span>
                          <p className="text-brand-stone">You have {pendingInvoices.length} outstanding invoice(s).</p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('billing')}
                          className="px-2.5 py-1.5 bg-brand-primary hover:bg-[#4E4E37] text-white font-bold rounded-lg text-[9.5px]"
                        >
                          Settle Now
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-white border border-brand-border rounded-xl text-[10.5px] text-brand-primary font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Lease fully paid & in compliance.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notifications & Announcements */}
                <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs space-y-4">
                  <h4 className="font-bold text-brand-dark text-sm font-serif border-b border-brand-border pb-3">
                    Seven Rocks Announcements
                  </h4>

                  <div className="space-y-3">
                    {matchingNotifications.length === 0 ? (
                      <p className="text-xs text-brand-stone italic">No announcements posted for this complex.</p>
                    ) : (
                      matchingNotifications.map((notif) => (
                        <div key={notif.id} className="p-3 bg-brand-surface border border-brand-border rounded-xl space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] bg-brand-primary text-white font-bold px-1.5 py-0.2 rounded uppercase">
                              {notif.targetAudience === 'All Tenants' ? 'All Complexes' : 'Priority Alert'}
                            </span>
                            <span className="text-[9px] text-brand-stone font-mono">{notif.sentAt}</span>
                          </div>
                          <h5 className="font-bold text-brand-dark leading-snug">{notif.title}</h5>
                          <p className="text-[11px] text-brand-secondary leading-relaxed">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* --- TABS 2: ADD-ON SERVICES --- */}
        {activeTab === 'addons' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs flex flex-col md:flex-row gap-6 justify-between items-start">
              <div>
                <h3 className="text-lg font-serif italic text-brand-dark font-bold">Elevate Your Living Experience</h3>
                <p className="text-xs text-brand-secondary leading-relaxed max-w-xl">
                  Order complete kitchenware packs, fitness passes, or co-working allowances. 
                  Request an invoice for any service add-on and pay directly at the front desk.
                </p>
              </div>

              {/* Request form inline */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const item = CATALOG_ITEMS.find(c => c.id === selectedAddOnId);
                  if (item) {
                    handleOpenConfirmModal(item);
                  }
                }} 
                className="bg-brand-surface p-4 border border-brand-border rounded-xl text-xs flex items-end gap-3.5 w-full md:w-auto shrink-0"
              >
                <div className="space-y-1.5 flex-1 md:flex-initial">
                  <label className="block font-bold text-brand-secondary">Select Service Option</label>
                  <select
                    value={selectedAddOnId}
                    onChange={(e) => setSelectedAddOnId(e.target.value)}
                    className="bg-white border border-brand-border rounded-lg p-2.5 text-brand-dark focus:outline-none w-full md:w-56 font-bold"
                  >
                    {CATALOG_ITEMS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.price})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white font-bold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Request Upgrade</span>
                </button>
              </form>
            </div>

            {/* Catalog Grid Removed */}

            {/* Request History log table */}
            <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs">
              <h4 className="font-bold text-brand-dark text-sm font-serif italic mb-4 border-b border-brand-border pb-3">
                Your Service Requests Queue
              </h4>

              {tenantAddOnRequests.length === 0 ? (
                <p className="text-xs text-brand-stone italic py-4">No historical service requests raised yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-brand-stone font-serif italic border-b border-brand-border pb-2">
                        <th className="pb-2">Request ID</th>
                        <th className="pb-2">Amenity Service</th>
                        <th className="pb-2">Request Date</th>
                        <th className="pb-2">Price Rate</th>
                        <th className="pb-2">Payment Method</th>
                        <th className="pb-2 text-right">Approval Status</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-surface font-medium text-brand-secondary">
                      {tenantAddOnRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-brand-surface/40">
                          <td className="py-3 font-mono font-bold text-brand-stone">{formatId(req.id)}</td>
                          <td className="py-3 font-bold text-brand-dark">{req.serviceName}</td>
                          <td className="py-3 font-mono">{req.requestDate?.split('T')[0] || req.requestDate}</td>
                          <td className="py-3 font-mono text-brand-primary font-bold">€{req.priceValue}</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                              req.paymentOption === 'Pay at Desk' || req.paymentOption?.includes('Desk')
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {req.paymentOption || 'Request Invoice (Pay at Desk)'}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              req.status === 'Approved' 
                                ? 'bg-brand-surface text-brand-primary border-brand-border'
                                : req.status === 'Pending'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {onDeleteAddOnRequest && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const confirmStr = req.status === 'Approved' 
                                    ? `cancel your active subscription for "${req.serviceName}"` 
                                    : `cancel this pending request for "${req.serviceName}"`;
                                  const isConfirmed = await confirmDialog("Cancel Add-On", `Are you sure you want to ${confirmStr}?`);
                                  if (isConfirmed) {
                                    onDeleteAddOnRequest(req.id);
                                  }
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                {req.status === 'Approved' ? 'Cancel Service' : 'Cancel Request'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- TABS 3: HOUSEKEEPING & SANITATION --- */}
        {activeTab === 'housekeeping' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form to Book clean */}
              <div className="lg:col-span-1 bg-white rounded-2xl border border-brand-border p-6 shadow-xs flex flex-col justify-between">
                <form onSubmit={handleHousekeepingSubmit} className="space-y-4 text-xs">
                  <div>
                    <h4 className="font-bold text-brand-dark text-sm font-serif italic">Book Professional Clean</h4>
                    <p className="text-[10px] text-brand-stone font-medium">Schedule room maintenance or laundry service</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block font-bold text-brand-stone">Frequency</label>
                      <select
                        value={hkFrequency}
                        onChange={(e) => setHkFrequency(e.target.value as any)}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-semibold text-brand-dark focus:outline-none"
                      >
                        <option value="Single Use">Single Use (€40.00)</option>
                        <option value="Bi-Weekly">Bi-Weekly (€120.00 / Mo)</option>
                        <option value="Monthly">Monthly (€140.00 / Mo)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-brand-stone">Preferred Date</label>
                      <input
                        type="date"
                        required
                        value={hkDate}
                        onChange={(e) => handleHkDateChange(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-bold font-mono text-brand-dark focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-brand-stone">Cleaning Instructions / Notes</label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Please vacuum carpet thoroughly, wash bath linens..."
                        value={hkNotes}
                        onChange={(e) => setHkNotes(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none placeholder-brand-stone/40"
                      />
                    </div>
                  </div>

                  {hkNoticeWarning && (
                    <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl leading-normal font-semibold text-[10px]">
                      {hkNoticeWarning}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-brand"
                  >
                    <Brush className="h-3.5 w-3.5" />
                    <span>Confirm Sanitation Booking</span>
                  </button>
                </form>
              </div>

              {/* Booking logs */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-brand-border p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-brand-dark text-sm font-serif italic border-b border-brand-border pb-3">
                      Scheduled Cleaning Logs
                    </h4>
                  </div>

                  {tenantHousekeepings.length === 0 ? (
                    <div className="text-center py-20 bg-[#FAF9F6] border-2 border-dashed border-brand-border rounded-xl text-brand-stone text-xs flex flex-col items-center justify-center space-y-2">
                      <Brush className="h-6 w-6 text-brand-stone animate-bounce" />
                      <span>No cleaning visits scheduled yet. Use the booking form to reserve.</span>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                      {tenantHousekeepings.map((hk) => (
                        <div 
                          key={hk.id} 
                          className="p-4 bg-brand-surface/40 hover:bg-brand-surface border border-brand-border rounded-xl flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-[9px] text-brand-stone font-bold">{formatId(hk.id)}</span>
                              <strong className="text-brand-dark">{hk.frequency} Cleaning</strong>
                              <span className="text-[10px] text-brand-primary font-bold font-mono">€{hk.priceValue.toFixed(2)}</span>
                            </div>
                            <p className="text-brand-secondary flex items-center gap-1 font-medium">
                              <Calendar className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                              Booked for <strong className="text-brand-dark font-semibold font-mono">{hk.scheduleDate}</strong>
                            </p>
                            {hk.notes && (
                              <p className="text-[10px] text-brand-stone italic pl-4 border-l-2 border-brand-border">
                                Notes: "{hk.notes}"
                              </p>
                            )}
                          </div>

                          <div>
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              hk.status === 'Completed' 
                                ? 'bg-brand-surface text-brand-primary border-brand-border'
                                : hk.status === 'Scheduled'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {hk.status}
                            </span>
                            
                            {(hk.status === 'Scheduled') && (
                              <button
                                onClick={() => handleCancelHousekeeping(hk.id, hk.frequency || 'Single Use')}
                                className="ml-3 px-2 py-1 bg-transparent hover:bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] font-bold transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* --- TABS 4: BILLING & ONLINE PAYMENTS --- */}
        {FEATURES.residentBilling && activeTab === 'billing' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="relative">
              {/* Solid shadow layer as a background */}
              <div className="absolute inset-0 bg-brand-primary/10 rounded-2xl translate-x-2 translate-y-2"></div>
              
              <div className="relative bg-brand-surface text-brand-dark p-6 rounded-2xl border border-brand-stone/60 flex flex-col sm:flex-row justify-between items-center gap-4 overflow-hidden">
                <div className="space-y-1.5 text-center sm:text-left z-10">
                  <span className="text-[9px] text-brand-secondary font-bold uppercase tracking-wider block">Total Surcharges Outstanding</span>
                  <h4 className="text-2xl font-serif font-bold text-natural-dark-olive">
                    €{totalOutstanding.toLocaleString('en-IE', { minimumFractionDigits: 2 })}
                  </h4>
                  <p className="text-[10px] text-brand-secondary">Itemized under reduced 10% residential rental VAT compliance tier.</p>
                </div>

                <div className="text-xs text-brand-secondary font-semibold flex items-center gap-2 z-10">
                  <ShieldCheck className="h-5 w-5 text-natural-dark-olive" />
                  <span>Encrypted Bank Escrow Protection</span>
                </div>
              </div>
            </div>

            {/* Table of invoices */}
            <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs">
              <h4 className="font-bold text-brand-dark text-sm font-serif italic mb-4 border-b border-brand-border pb-3">
                Rent Invoices Ledger
              </h4>

              {tenantInvoices.length === 0 ? (
                <p className="text-xs text-brand-stone italic py-4">No billing ledgers parsed yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-brand-stone font-serif italic border-b border-brand-border pb-2">
                        <th className="pb-2">Invoice ID</th>
                        <th className="pb-2">Issue Date</th>
                        <th className="pb-2">Due Date</th>
                        <th className="pb-2">Rent / Deposit Summary</th>
                        <th className="pb-2 font-mono">Tax VAT (10%)</th>
                        <th className="pb-2 font-mono">Total (Incl. VAT)</th>
                        <th className="pb-2">Payment Info</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-surface font-medium text-brand-secondary">
                      {tenantInvoices.map((inv) => {
                        const description = [];
                        if (inv.rentAmount > 0) description.push(`Rent: €${inv.rentAmount}`);
                        if (inv.depositAmount > 0) description.push(`Deposit: €${inv.depositAmount}`);
                        if (inv.adminFee > 0) description.push(`Admin: €${inv.adminFee}`);
                        if (inv.addOnTotal > 0) description.push(`Services: €${inv.addOnTotal}`);

                        return (
                          <tr key={inv.id} className="hover:bg-brand-surface/40">
                            <td className="py-4 font-mono font-bold text-brand-dark">
                              <div>{formatId(inv.id)}</div>
                              {inv.invoiceFileName && (
                                <button
                                  type="button"
                                  onClick={() => showToast(`File preview: ${inv.invoiceFileName}`, 'info')}
                                  className="text-[9px] text-emerald-700 hover:text-emerald-800 underline flex items-center gap-0.5 mt-0.5 font-sans font-semibold cursor-pointer"
                                >
                                  <Receipt className="h-2.5 w-2.5 shrink-0" />
                                  <span>View File</span>
                                </button>
                              )}
                            </td>
                            <td className="py-4 font-mono">{inv.date}</td>
                            <td className="py-4 font-mono">{inv.dueDate}</td>
                            <td className="py-4 text-[11px] truncate max-w-[200px]" title={description.join(', ')}>
                              {description.join(', ')}
                            </td>
                            <td className="py-4 font-mono text-brand-stone">€{inv.vatAmount.toFixed(2)}</td>
                            <td className="py-4 font-mono font-bold text-brand-dark">€{inv.totalAmount.toFixed(2)}</td>
                            <td className="py-4 text-[10.5px]">
                              {inv.status === 'Paid' ? (
                                <span className="text-brand-primary block font-serif italic">
                                  Settled via {inv.paymentMethod || 'Desk Terminal'}
                                </span>
                              ) : (
                                <span className="text-brand-stone block">Unpaid</span>
                              )}
                            </td>
                            <td className="py-4 text-right">
                              {inv.status === 'Paid' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-surface text-brand-primary border border-brand-border">
                                  Paid & Settled
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setCheckoutInvoice(inv)}
                                  className="px-3 py-1.5 bg-brand-primary hover:bg-[#4E4E37] text-white text-[10px] font-bold rounded-lg cursor-pointer"
                                >
                                  Request Desk Invoice
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- TABS 5: SUPPORT TICKETS --- */}
        {activeTab === 'support' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form to raise ticket */}
              <div className="lg:col-span-1 bg-white rounded-2xl border border-brand-border p-6 shadow-xs flex flex-col justify-between">
                <form onSubmit={handleTicketSubmit} className="space-y-4 text-xs">
                  <div>
                    <h4 className="font-bold text-brand-dark text-sm font-serif italic">Open Support Ticket</h4>
                    <p className="text-[10px] text-brand-stone font-medium">Alert facility management about room maintenance</p>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block font-bold text-brand-stone">Category</label>
                        <select
                          value={tckCategory}
                          onChange={(e) => setTckCategory(e.target.value as any)}
                          className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-semibold text-brand-dark focus:outline-none"
                        >
                          <option value="Plumbing">Plumbing</option>
                          <option value="Electrical">Electrical</option>
                          <option value="Internet/Wi-Fi">Internet/Wi-Fi</option>
                          <option value="Appliance">Appliance</option>
                          <option value="Key/Access">Key/Access</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block font-bold text-brand-stone">Priority</label>
                        <select
                          value={tckPriority}
                          onChange={(e) => setTckPriority(e.target.value as any)}
                          className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-semibold text-brand-dark focus:outline-none"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-brand-stone">Subject / Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Shower drain draining slowly"
                        value={tckSubject}
                        onChange={(e) => setTckSubject(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none placeholder-brand-stone/40"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-brand-stone">Issue Description</label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Please supply specific details, location inside suite, or troubleshooting steps completed..."
                        value={tckDesc}
                        onChange={(e) => setTckDesc(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none placeholder-brand-stone/40 leading-relaxed"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-brand"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Raise Support Ticket</span>
                  </button>
                </form>
              </div>

              {/* Tickets list */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-brand-border p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-brand-dark text-sm font-serif italic border-b border-brand-border pb-3">
                      Your Registered Support Tickets
                    </h4>
                  </div>

                  {tenantTickets.length === 0 ? (
                    <div className="text-center py-20 bg-[#FAF9F6] border-2 border-dashed border-brand-border rounded-xl text-brand-stone text-xs flex flex-col items-center justify-center space-y-2">
                      <MessageSquare className="h-6 w-6 text-brand-stone" />
                      <span>No maintenance requests raised yet.</span>
                    </div>
                  ) : (
                    <div className="space-y-3.5 overflow-y-auto max-h-[350px] pr-1">
                      {tenantTickets.map((tck) => (
                        <div 
                          key={tck.id} 
                          className="p-4 bg-brand-surface/40 hover:bg-brand-surface border border-brand-border rounded-xl space-y-2 text-xs transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <span className="font-mono text-[9px] text-brand-stone font-bold">{formatId(tck.id)}</span>
                                <strong className="text-brand-dark text-xs">{tck.subject}</strong>
                                <span className="inline-block px-1.5 py-0.2 bg-brand-bg text-brand-stone text-[9px] border border-brand-border rounded uppercase font-bold">
                                  {tck.category}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                tck.priority === 'High' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-brand-bg text-brand-secondary border border-brand-border'
                              }`}>
                                {tck.priority} Priority
                              </span>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                tck.status === 'Resolved' 
                                  ? 'bg-brand-surface text-brand-primary border-brand-border'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {tck.status}
                              </span>
                            </div>
                          </div>

                          <p className="text-brand-secondary leading-relaxed font-medium pl-2 border-l border-brand-border">
                            {tck.description}
                          </p>

                          <div className="text-[10px] text-brand-stone font-medium font-mono pt-1">
                            Opened: {tck.createdAt}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* --- TABS 6: TERMS & POLICIES --- */}
        {activeTab === 'policies' && (
          <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            
            {/* Header section with styling */}
            <div className="relative">
              {/* Solid shadow layer as a background */}
              <div className="absolute inset-0 bg-brand-primary/10 rounded-3xl translate-x-2 translate-y-2"></div>
              
              <div className="relative bg-brand-surface text-brand-dark p-6 rounded-3xl border border-brand-stone/60 space-y-2 overflow-hidden">
                <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-brand-primary/5 blur-3xl pointer-events-none" />
                <div className="z-10 relative space-y-1.5">
                  <span className="text-[10px] bg-brand-bg text-natural-dark-olive border border-brand-stone/30 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                    Official Guidelines & Contracts
                  </span>
                  <h3 className="text-xl font-serif font-bold text-natural-dark-olive">Seven Rocks Terms & Co-Living Policies</h3>
                  <p className="text-xs text-brand-secondary font-medium max-w-2xl leading-relaxed">
                    Review the community code of conduct, security deposit rules, and operational procedures that ensure a safe, clean, and collaborative premium environment.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left sidebar: category selection & search */}
              <div className="lg:col-span-1 space-y-4">
                
                {/* Search bar */}
                <div className="bg-white rounded-2xl border border-brand-border p-4 shadow-xs space-y-2">
                  <label className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">Search Guidelines</label>
                  <input
                    type="text"
                    placeholder="e.g. noise, deposit..."
                    value={policySearch}
                    onChange={(e) => setPolicySearch(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl p-2.5 text-xs font-medium text-brand-dark focus:outline-none placeholder-brand-stone/40 leading-normal"
                  />
                  {policySearch && (
                    <button
                      type="button"
                      onClick={() => setPolicySearch('')}
                      className="text-[10px] text-brand-stone hover:text-brand-dark underline font-bold"
                    >
                      Clear Search
                    </button>
                  )}
                </div>

                {/* Category buttons */}
                <div className="bg-white rounded-2xl border border-brand-border p-3 shadow-xs space-y-1">
                  <span className="block text-[10px] font-bold text-brand-stone uppercase tracking-widest px-3 py-1.5 border-b border-brand-border mb-2 font-serif italic">Categories</span>
                  {[
                    { key: 'all', label: 'All Guidelines' },
                    { key: 'house_rules', label: 'House Rules' },
                    { key: 'billing', label: 'Billing & Escrow' },
                    { key: 'checkin_checkout', label: 'Check-In/Out' },
                    { key: 'legal', label: 'Legal & Insurance' }
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => {
                        setActivePolicyCategory(cat.key as any);
                        setExpandedPolicyId(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activePolicyCategory === cat.key
                          ? 'bg-brand-primary text-white'
                          : 'text-brand-secondary hover:bg-brand-surface hover:text-brand-dark'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-[10px] text-brand-stone font-medium leading-relaxed">
                  Need an official signed copy of your registration agreement or lease certificate? Please open a <strong>Support Ticket</strong> and our Berlin Mitte team will email it to you.
                </div>
              </div>

              {/* Right panel: dynamic list of policy cards */}
              <div className="lg:col-span-3 space-y-4">
                {policies.filter(item => {
                  const matchesCategory = activePolicyCategory === 'all' || item.category === activePolicyCategory;
                  const matchesSearch = item.question.toLowerCase().includes(policySearch.toLowerCase()) || 
                    item.answer.toLowerCase().includes(policySearch.toLowerCase());
                  return matchesCategory && matchesSearch;
                }).length === 0 ? (
                  <div className="bg-white rounded-2xl border border-brand-border p-12 text-center text-xs text-brand-stone space-y-2">
                    <FileText className="h-8 w-8 mx-auto text-brand-stone/60" />
                    <p className="font-bold">No results found matching your search.</p>
                    <p className="text-[10px]">Try searching for keywords like "quiet", "deposit", "key" or select another category.</p>
                  </div>
                ) : (
                  policies.filter(item => {
                    const matchesCategory = activePolicyCategory === 'all' || item.category === activePolicyCategory;
                    const matchesSearch = item.question.toLowerCase().includes(policySearch.toLowerCase()) || 
                      item.answer.toLowerCase().includes(policySearch.toLowerCase());
                    return matchesCategory && matchesSearch;
                  }).map((item) => {
                    const isExpanded = expandedPolicyId === item.id;
                    return (
                      <div 
                        key={item.id} 
                        className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-xs transition-all"
                      >
                        {/* Header banner trigger */}
                        <button
                          type="button"
                          onClick={() => setExpandedPolicyId(isExpanded ? null : item.id)}
                          className="w-full flex items-start justify-between p-5 text-left hover:bg-brand-surface/20 transition-colors focus:outline-none cursor-pointer"
                        >
                          <div className="space-y-1.5 pr-4">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#DED9CF] text-brand-primary uppercase tracking-wider">
                                {item.category.replace('_', ' ')}
                              </span>
                              <h4 className="font-serif italic font-extrabold text-brand-dark text-sm leading-tight">
                                {item.question}
                              </h4>
                            </div>
                            <p className="text-xs text-brand-secondary font-medium leading-relaxed line-clamp-2">
                              {item.answer}
                            </p>
                          </div>
                          <span className="text-brand-primary font-bold text-sm select-none shrink-0 mt-1 bg-brand-surface h-6 w-6 rounded-lg flex items-center justify-center border border-brand-border">
                            {isExpanded ? '−' : '+'}
                          </span>
                        </button>

                        {/* Expandable details list */}
                        {isExpanded && (
                          <div className="px-6 pb-6 pt-2 border-t border-brand-surface/40 bg-[#FAF9F6] animate-fade-in space-y-3">
                            <div className="text-xs text-brand-secondary font-medium leading-relaxed whitespace-pre-wrap">
                              {item.answer}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>

          </div>
        )}

      </>
    )}

      </main>

      {/* --- DESK PAYMENT & INVOICE REQUEST MODAL --- */}
      {FEATURES.residentBilling && checkoutInvoice && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-brand-border max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            
            <div className="flex justify-between items-start border-b border-brand-surface pb-4">
              <div>
                <h3 className="font-bold text-brand-dark text-base font-serif italic">Front Desk Invoice & Settlement</h3>
                <p className="text-xs text-brand-stone">Request invoice & arrange payment at reception</p>
              </div>
              <button 
                onClick={() => setCheckoutInvoice(null)}
                className="text-brand-stone hover:text-brand-dark cursor-pointer p-1"
                disabled={paymentProcessing}
              >
                ✕
              </button>
            </div>

            <div className="bg-brand-surface p-4 rounded-xl border border-brand-border/60 text-xs space-y-1.5 leading-relaxed">
              <div className="flex justify-between text-brand-secondary font-semibold">
                <span>Invoice Statement:</span>
                <strong className="text-brand-dark font-mono font-bold">{checkoutInvoice.id}</strong>
              </div>
              <div className="flex justify-between text-brand-secondary font-semibold">
                <span>Due Date:</span>
                <span className="font-mono text-brand-dark">{checkoutInvoice.dueDate}</span>
              </div>
              <div className="pt-2 border-t border-brand-border flex justify-between items-baseline">
                <span className="text-brand-secondary font-bold font-serif italic text-sm">Total Invoice Value:</span>
                <span className="text-lg font-mono font-extrabold text-brand-primary">€{checkoutInvoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePayInvoiceSubmit} className="space-y-4 text-xs">
              
              <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-brand-dark font-bold text-xs">
                  <Building className="h-4 w-4 text-brand-primary shrink-0" />
                  <span>Desk Payment Policy</span>
                </div>
                <p className="text-[11px] text-brand-secondary leading-relaxed">
                  All payments are made directly at the front desk. Accepted payment methods include:
                </p>
                <ul className="text-[10.5px] text-brand-stone font-medium space-y-1 list-disc list-inside">
                  <li>Cash at reception</li>
                  <li>Physical Debit / Credit Card (Terminal)</li>
                  <li>Contactless / Apple Pay / Google Pay</li>
                </ul>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutInvoice(null)}
                  disabled={paymentProcessing}
                  className="flex-1 py-2.5 bg-brand-surface hover:bg-brand-bg border border-brand-border text-brand-secondary rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentProcessing}
                  className="flex-1 py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-brand"
                >
                  {paymentProcessing ? (
                    <div className="h-4.5 w-4.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Receipt className="h-4 w-4" />
                      <span>Request Desk Invoice</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- TERMS & POLICIES MODAL OVERLAY --- */}
      {showPoliciesModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FAF9F6] rounded-3xl border border-brand-border max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Header */}
            <div className="bg-brand-surface text-brand-dark p-6 flex justify-between items-center shrink-0 border-b border-brand-stone/60">
              <div className="space-y-1">
                <h3 className="font-bold text-natural-dark-olive text-base font-serif">Community Guidelines, Terms & Policies</h3>
                <p className="text-xs text-brand-secondary font-medium">Seven Rocks Premium Co-Living Stays Agreements</p>
              </div>
              <button 
                onClick={() => {
                  setShowPoliciesModal(false);
                  setPolicySearch('');
                  setActivePolicyCategory('all');
                  setExpandedPolicyId(null);
                }}
                className="text-brand-stone hover:text-brand-dark cursor-pointer p-1.5 rounded-lg border border-brand-stone/40 hover:bg-brand-border/40 text-xs font-bold"
              >
                ✕ Close Window
              </button>
            </div>

            {/* Inner modal body with scrolling content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Category filters */}
                <div className="md:col-span-1 space-y-4">
                  {/* Search */}
                  <div className="bg-white rounded-xl border border-brand-border p-3 space-y-1.5 shadow-xs">
                    <label className="block text-[9px] font-bold text-brand-stone uppercase tracking-wider">Search</label>
                    <input
                      type="text"
                      placeholder="e.g. sound, room..."
                      value={policySearch}
                      onChange={(e) => setPolicySearch(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-lg p-2 text-xs font-medium text-brand-dark focus:outline-none placeholder-brand-stone/40"
                    />
                  </div>

                  {/* Categories */}
                  <div className="bg-white rounded-xl border border-brand-border p-2 space-y-0.5 shadow-xs">
                    {[
                      { key: 'all', label: 'All Rules' },
                      { key: 'house_rules', label: 'House Rules' },
                      { key: 'billing', label: 'Billing & Escrow' },
                      { key: 'checkin_checkout', label: 'Check-In/Out' },
                      { key: 'legal', label: 'Legal & Insurance' }
                    ].map((cat) => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => {
                          setActivePolicyCategory(cat.key as any);
                          setExpandedPolicyId(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          activePolicyCategory === cat.key
                            ? 'bg-brand-primary text-white'
                            : 'text-brand-secondary hover:bg-brand-surface hover:text-brand-dark'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Policies list */}
                <div className="md:col-span-3 space-y-3">
                  {policies.filter(item => {
                    const matchesCategory = activePolicyCategory === 'all' || item.category === activePolicyCategory;
                    const matchesSearch = item.question.toLowerCase().includes(policySearch.toLowerCase()) || 
                      item.answer.toLowerCase().includes(policySearch.toLowerCase());
                    return matchesCategory && matchesSearch;
                  }).length === 0 ? (
                    <div className="bg-white rounded-xl border border-brand-border p-12 text-center text-xs text-brand-stone space-y-1">
                      <FileText className="h-6 w-6 mx-auto text-brand-stone/60" />
                      <p className="font-bold">No results found.</p>
                      <p className="text-[10px]">Try typing another word.</p>
                    </div>
                  ) : (
                    policies.filter(item => {
                      const matchesCategory = activePolicyCategory === 'all' || item.category === activePolicyCategory;
                      const matchesSearch = item.question.toLowerCase().includes(policySearch.toLowerCase()) || 
                        item.answer.toLowerCase().includes(policySearch.toLowerCase());
                      return matchesCategory && matchesSearch;
                    }).map((item) => {
                      const isExpanded = expandedPolicyId === item.id;
                      return (
                        <div 
                          key={item.id} 
                          className="bg-white rounded-xl border border-brand-border overflow-hidden shadow-xs"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedPolicyId(isExpanded ? null : item.id)}
                            className="w-full flex items-start justify-between p-4 text-left hover:bg-brand-surface/10 transition-colors focus:outline-none cursor-pointer"
                          >
                            <div className="space-y-1 pr-3">
                              <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#DED9CF] text-brand-primary uppercase tracking-wide">
                                  {item.category.replace('_', ' ')}
                                </span>
                                <h4 className="font-serif italic font-bold text-brand-dark text-xs">
                                  {item.question}
                                </h4>
                              </div>
                              <p className="text-[10px] text-brand-secondary font-medium line-clamp-2">
                                {item.answer}
                              </p>
                            </div>
                            <span className="text-brand-primary font-bold text-xs select-none shrink-0 mt-0.5 bg-brand-surface h-5 w-5 rounded-md flex items-center justify-center border border-brand-border">
                              {isExpanded ? '−' : '+'}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="px-5 pb-5 pt-1.5 border-t border-brand-surface bg-[#FAF9F6] space-y-2.5">
                              <div className="text-[11px] text-brand-secondary font-medium leading-relaxed whitespace-pre-wrap">
                                {item.answer}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="bg-white border-t border-brand-border p-4 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowPoliciesModal(false);
                  setPolicySearch('');
                  setActivePolicyCategory('all');
                  setExpandedPolicyId(null);
                }}
                className="px-5 py-2 bg-brand-primary hover:bg-[#4E4E37] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-brand"
              >
                Acknowledge & Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- CONFIRM ADD-ON UPGRADE PAYMENT MODAL --- */}
      {confirmAddOnItem && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FAF9F6] rounded-3xl border border-brand-border max-w-md w-full flex flex-col overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Header */}
            <div className="bg-brand-surface text-brand-dark p-6 shrink-0 border-b border-brand-stone/60">
              <span className="text-[9px] bg-brand-bg text-brand-primary border border-brand-stone/30 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider block w-max mb-1.5">
                Confirm Service Upgrade
              </span>
              <h3 className="font-bold text-natural-dark-olive text-lg font-serif">
                {confirmAddOnItem.name}
              </h3>
              <p className="text-xs text-brand-secondary font-medium">Seven Rocks Premium Co-Living Stays</p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="bg-brand-surface p-4 rounded-xl border border-brand-border space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-brand-border/60 pb-2">
                  <span className="text-brand-stone font-semibold">Price Rate:</span>
                  <strong className="text-brand-primary text-sm font-mono">{confirmAddOnItem.price}</strong>
                </div>
                <p className="text-[11px] text-brand-secondary font-medium leading-relaxed pt-1">
                  {confirmAddOnItem.desc}
                </p>
              </div>

              {/* Desk Invoice Notice */}
              <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-brand-dark font-bold text-xs">
                  {FEATURES.residentBilling ? (
                    <>
                      <Receipt className="h-4 w-4 text-brand-primary shrink-0" />
                      <span>Request Invoice for Add-On</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-brand-primary shrink-0" />
                      <span>Submit Add-on Request</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-brand-secondary leading-relaxed">
                  {FEATURES.residentBilling
                    ? 'Upon submitting this request, an invoice will be generated. You can settle payment directly at the reception desk via cash, card, or Apple Pay.'
                    : 'Your request will be submitted to the management team for review. Once approved, the service fee will be included in your monthly statement.'}
                </p>
              </div>

              <p className="text-[10px] text-brand-stone font-medium leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                ⚠️ Mid-month upgrades are prorated. Subscription items recur monthly and require a 14-day notice period to cancel.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-brand-border p-4 flex justify-end space-x-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmAddOnItem(null)}
                className="px-4 py-2 text-brand-secondary hover:text-brand-dark text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddOnSubmit}
                className="px-5 py-2 bg-brand-primary hover:bg-[#4E4E37] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-brand flex items-center space-x-1.5"
              >
                {FEATURES.residentBilling ? (
                  <>
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Request Invoice for Add-On</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Submit Add-On Request</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox Modal for Inspection Images */}
      {selectedInspectionImage && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-[100] backdrop-blur-md animate-fade-in">
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button
              onClick={() => setSelectedInspectionImage(null)}
              className="absolute top-[-40px] right-0 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Close Lightbox"
            >
              <X className="h-5 w-5" />
              <span>Close</span>
            </button>
            <div className="bg-white rounded-2xl border border-white/10 overflow-hidden p-2 shadow-2xl max-h-[80vh] flex items-center justify-center">
              <img 
                src={selectedInspectionImage} 
                alt="Inspection Close-up" 
                className="max-h-[75vh] max-w-full object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="mt-3 text-center text-white/90 text-xs font-semibold tracking-wide font-sans">
              Property handover inspection photograph
            </div>
          </div>
        </div>
      )}

      {/* 4. Login Alert Notification Modal */}
      {loginAlertNotification && (
        <div className="fixed inset-0 bg-[#2C2C2C]/55 backdrop-blur-xs flex items-center justify-center p-4 z-[90] animate-fade-in">
          <div className="bg-[#FAF9F6] rounded-3xl border border-brand-stone/60 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-scale-up">
            
            {/* Header banner */}
            <div className="bg-brand-surface text-brand-dark p-5 border-b border-brand-stone/60 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-brand-bg text-brand-primary border border-brand-stone/30 rounded-xl">
                  <Bell className="h-5 w-5 text-brand-primary animate-bounce" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-brand-dark">New Property Announcement</h3>
                  <p className="text-[10px] text-brand-secondary font-mono font-medium">Seven Rocks Operations Team</p>
                </div>
              </div>
              <button 
                onClick={() => handleAcknowledgeNotification(loginAlertNotification.id)}
                className="text-brand-stone hover:text-brand-dark p-1 rounded-lg hover:bg-brand-border/40 transition-colors cursor-pointer"
                title="Dismiss Alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Message Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-brand-stone font-serif">
                  Notification Received: {new Date(loginAlertNotification.sentAt).toLocaleDateString('en-IE', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <h4 className="text-sm font-bold text-natural-dark-olive leading-snug">{loginAlertNotification.title}</h4>
              </div>
              
              <p className="text-xs text-brand-secondary leading-relaxed bg-white p-4 rounded-xl border border-brand-border font-medium">
                {loginAlertNotification.message}
              </p>

              <div className="text-[11px] text-brand-primary font-bold flex items-center gap-1.5 bg-brand-surface p-3 rounded-lg border border-brand-border">
                <CheckCircle2 className="h-4 w-4 text-brand-primary shrink-0" />
                <span>We got a new notification. Please review this notice carefully.</span>
              </div>
            </div>

            {/* Footer button */}
            <div className="bg-brand-surface border-t border-brand-border p-4 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => handleAcknowledgeNotification(loginAlertNotification.id)}
                className="w-full px-5 py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-brand text-center"
              >
                I have read and acknowledge this update
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. Early Departure / Cancellation Modal */}
      {showDepartureModal && (
        <div className="fixed inset-0 bg-[#2C2C2C]/55 backdrop-blur-xs flex items-center justify-center p-4 z-[90] animate-fade-in">
          <div className="bg-[#FAF9F6] rounded-3xl border border-brand-stone/60 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-scale-up">
            
            <div className="bg-brand-surface text-brand-dark p-5 border-b border-brand-stone/60 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl">
                  <Clock className="h-5 w-5 text-rose-700" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-brand-dark">Early Departure Request</h3>
                  <p className="text-[10px] text-brand-secondary font-mono font-medium">Processed via Priority Support Ticket</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDepartureModal(false)}
                className="text-brand-stone hover:text-brand-dark p-1 rounded-lg hover:bg-brand-border/40 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRequestEarlyDeparture} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed font-medium">
                Per tenancy policy, early departure requests are routed directly to management as a priority support ticket for manual review and clearance scheduling.
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Requested Move-Out Date</label>
                <input
                  type="date"
                  required
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full bg-white border border-brand-border rounded-xl p-2.5 text-xs text-brand-dark font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Reason for Early Departure</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Please describe reason for departure (relocation, job change, emergency)..."
                  value={departureReason}
                  onChange={(e) => setDepartureReason(e.target.value)}
                  className="w-full bg-white border border-brand-border rounded-xl p-2.5 text-xs text-brand-dark font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setShowDepartureModal(false)}
                  className="px-4 py-2 text-brand-secondary hover:text-brand-dark font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Submit Ticket Request
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
