import { useState, FormEvent, useEffect } from 'react';
import { useToast } from '../lib/useToast';
import { formatId } from '../lib/formatId';
import { 
  Receipt, 
  Coins, 
  CreditCard, 
  Plus, 
  Check, 
  X, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Search, 
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Filter,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { Invoice, Tenant, Notification } from '../types';

export type SortColumn = 'tenantName' | 'date' | 'vatAmount' | 'totalAmount' | 'status';

export interface SortRule {
  column: SortColumn;
  direction: 'asc' | 'desc';
}

interface BillingViewProps {
  invoices: Invoice[];
  tenants: Tenant[];
  searchTerm: string;
  onUpdateInvoiceStatus: (id: string, status: 'Paid' | 'Pending' | 'Overdue', paymentMethod?: string, paymentChannel?: 'Online' | 'Desk', notes?: string) => void;
  onAddInvoice: (invoice: Invoice) => void;
  onAddActivity: (type: 'tenant' | 'billing' | 'addon' | 'ticket' | 'notification', action: string, details: string) => void;
  onAddNotification?: (newNtf: Notification) => void;
}

export default function BillingView({ 
  invoices, 
  tenants, 
  searchTerm, 
  onUpdateInvoiceStatus,
  onAddInvoice,
  onAddActivity,
  onAddNotification
}: BillingViewProps) {
  const { showToast, ToastElement } = useToast();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(invoices[0]?.id || null);
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('All');
  
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { column: 'date', direction: 'desc' }
  ]);
  const [showSortManager, setShowSortManager] = useState(false);

  // Custom manual invoice form state
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [formTenantId, setFormTenantId] = useState(tenants[0]?.id || '');
  const [formAddonTotal, setFormAddonTotal] = useState(0);
  const [formRentAmount, setFormRentAmount] = useState(1200);
  const [formDepositAmount, setFormDepositAmount] = useState(0);
  const [formAdminFee, setFormAdminFee] = useState(0);

  // Third-party Invoice upload form states
  const [showUploadInvoiceModal, setShowUploadInvoiceModal] = useState(false);
  const [uploadInvoiceNumber, setUploadInvoiceNumber] = useState('');
  const [uploadPrice, setUploadPrice] = useState('');
  const [uploadTenantId, setUploadTenantId] = useState(tenants[0]?.id || '');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Desk Settlement log state
  const [deskSearchTerm, setDeskSearchTerm] = useState('');
  const [deskFilterMethod, setDeskFilterMethod] = useState<'All' | 'Terminal' | 'Cash' | 'Manual'>('All');
  const [showQuickDeskModal, setShowQuickDeskModal] = useState(false);
  const [quickDeskInvoiceId, setQuickDeskInvoiceId] = useState('');
  const [quickDeskMethod, setQuickDeskMethod] = useState('Desk Terminal (Cash/Card)');
  const [quickDeskNotes, setQuickDeskNotes] = useState('');

  const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);

  // Recurring background check states
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const [backgroundScanLog, setBackgroundScanLog] = useState<string>('');
  const [nearingInvoicesCount, setNearingInvoicesCount] = useState<number>(0);

  const getDaysRemaining = (dueDateStr: string): number => {
    const due = new Date(dueDateStr);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    const performScan = () => {
      const pendingNearing = invoices.filter(inv => {
        if (inv.status !== 'Pending') return false;
        const days = getDaysRemaining(inv.dueDate);
        return days >= 0 && days <= 3;
      });
      
      const timeStr = new Date().toLocaleTimeString();
      setLastCheckTime(timeStr);
      setNearingInvoicesCount(pendingNearing.length);
      if (pendingNearing.length > 0) {
        setBackgroundScanLog(`Found ${pendingNearing.length} pending monthly/service invoice(s) nearing their due date (within 3 days).`);
      } else {
        setBackgroundScanLog('All active invoices monitored. No pending invoices with imminent due dates within 3 days.');
      }
    };

    // Run immediately on load
    performScan();

    // Recur scanning in background every 15 seconds
    const interval = setInterval(performScan, 15000);
    return () => clearInterval(interval);
  }, [invoices]);

  const handleSendReminder = (invoice: Invoice) => {
    if (!onAddNotification) return;

    const daysLeft = getDaysRemaining(invoice.dueDate);
    let daysStr = '';
    if (daysLeft < 0) {
      daysStr = `is OVERDUE by ${Math.abs(daysLeft)} days`;
    } else if (daysLeft === 0) {
      daysStr = `is DUE TODAY`;
    } else {
      daysStr = `is due in ${daysLeft} days (Due: ${invoice.dueDate})`;
    }

    const title = `⚠️ Monthly Rent Payment Reminder`;
    const message = `Dear ${invoice.tenantName}, this is a friendly reminder that your monthly invoice ${invoice.id} for €${(invoice.totalAmount ?? 0).toFixed(2)} ${daysStr}. Please settle your balance in the Billing tab as soon as possible.`;

    onAddNotification({
      id: `NTF-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      message,
      targetAudience: 'Specific Tenant',
      targetValue: invoice.tenantName, // matches targetValue === tenant.name in ResidentPortal.tsx
      sentAt: new Date().toISOString().split('T')[0],
      readCount: 0,
      deliveredCount: 1
    });

    onAddActivity(
      'notification',
      'Sent Invoice Reminder',
      `Sent automated payment reminder notification to ${invoice.tenantName} for Invoice ${invoice.id} (${daysStr}).`
    );

    showToast(`Notification reminder sent successfully to ${invoice.tenantName}!`);
  };

  const handleSendAllReminders = () => {
    const pendingNearing = invoices.filter(inv => {
      if (inv.status !== 'Pending') return false;
      const days = getDaysRemaining(inv.dueDate);
      return days >= 0 && days <= 3;
    });

    if (pendingNearing.length === 0) {
      showToast('No pending invoices are currently within 3 days of their due date.', 'info');
      return;
    }

    pendingNearing.forEach(inv => {
      const daysLeft = getDaysRemaining(inv.dueDate);
      let daysStr = '';
      if (daysLeft === 0) {
        daysStr = `is DUE TODAY`;
      } else {
        daysStr = `is due in ${daysLeft} days (Due: ${inv.dueDate})`;
      }

      onAddNotification?.({
        id: `NTF-${Math.floor(1000 + Math.random() * 9000)}`,
        title: `⚠️ Monthly Rent Payment Reminder`,
        message: `Dear ${inv.tenantName}, this is a friendly reminder that your monthly invoice ${inv.id} for €${(inv.totalAmount ?? 0).toFixed(2)} ${daysStr}. Please settle your balance in the Billing tab as soon as possible.`,
        targetAudience: 'Specific Tenant',
        targetValue: inv.tenantName,
        sentAt: new Date().toISOString().split('T')[0],
        readCount: 0,
        deliveredCount: 1
      });

      onAddActivity(
        'notification',
        'Sent Invoice Reminder (Bulk)',
        `Sent automated payment reminder notification to ${inv.tenantName} for Invoice ${inv.id} (${daysStr}).`
      );
    });

    showToast(`All reminders (${pendingNearing.length}) dispatched successfully to respective tenants.`);
  };

  // Filter list
  const filteredInvoicesUnsorted = invoices.filter(inv => {
    const matchesSearch = inv.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterPaymentStatus === 'All') return matchesSearch;
    return matchesSearch && inv.status === filterPaymentStatus;
  });

  const filteredInvoices = [...filteredInvoicesUnsorted].sort((a, b) => {
    const activeRules = sortRules.length > 0 ? sortRules : [{ column: 'date', direction: 'desc' } as const];
    for (const rule of activeRules) {
      let comp = 0;
      if (rule.column === 'tenantName') {
        comp = a.tenantName.localeCompare(b.tenantName, 'de', { sensitivity: 'base' });
      } else if (rule.column === 'date') {
        comp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (rule.column === 'vatAmount') {
        comp = (a.vatAmount ?? 0) - (b.vatAmount ?? 0);
      } else if (rule.column === 'totalAmount') {
        comp = (a.totalAmount ?? 0) - (b.totalAmount ?? 0);
      } else if (rule.column === 'status') {
        comp = a.status.localeCompare(b.status, undefined, { sensitivity: 'base' });
      }

      if (comp !== 0) {
        return rule.direction === 'asc' ? comp : -comp;
      }
    }
    return 0;
  });

  // Calculate high level numbers
  const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending');
  const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue');

  const totalCollected = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  const onlineCollected = paidInvoices
    .filter(inv => inv.paymentChannel === 'Online' || (!inv.paymentChannel && inv.paymentMethod?.toLowerCase().includes('online')))
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const deskCollected = paidInvoices
    .filter(inv => inv.paymentChannel === 'Desk' || (!inv.paymentChannel && !inv.paymentMethod?.toLowerCase().includes('online')))
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0) + 
                            overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  // Handle manual checkout/pay logging
  const handleRecordPayment = (id: string, method: string, channel: 'Online' | 'Desk', notes?: string) => {
    onUpdateInvoiceStatus(id, 'Paid', method, channel, notes);
    
    const invoiceObj = invoices.find(inv => inv.id === id);
    if (invoiceObj) {
      onAddActivity(
        'billing',
        'Logged Manual Payment',
        `Invoice ${id} marked as PAID. Channel: ${channel}. Method: ${method}.${notes ? ` Notes: ${notes}.` : ''} Total collected: €${(invoiceObj.totalAmount ?? 0).toFixed(2)}.`
      );
    }
  };

  // Filter Desk Settlement Logs (All Paid Invoices processed at Desk or via Reception)
  const deskSettledInvoices = invoices.filter(inv => inv.status === 'Paid');
  const filteredDeskLogs = deskSettledInvoices.filter(inv => {
    const searchLower = deskSearchTerm.toLowerCase();
    const matchesSearch = inv.id.toLowerCase().includes(searchLower) ||
                          inv.tenantName.toLowerCase().includes(searchLower) ||
                          inv.roomNumber.toLowerCase().includes(searchLower) ||
                          (inv.paymentMethod && inv.paymentMethod.toLowerCase().includes(searchLower)) ||
                          (inv.notes && inv.notes.toLowerCase().includes(searchLower));
    if (!matchesSearch) return false;

    if (deskFilterMethod === 'All') return true;
    if (deskFilterMethod === 'Terminal') return inv.paymentMethod?.toLowerCase().includes('terminal') || inv.paymentMethod?.toLowerCase().includes('card');
    if (deskFilterMethod === 'Cash') return inv.paymentMethod?.toLowerCase().includes('cash');
    if (deskFilterMethod === 'Manual') return !inv.paymentMethod?.toLowerCase().includes('terminal') && !inv.paymentMethod?.toLowerCase().includes('cash');
    return true;
  });

  const handleExportDeskLog = () => {
    if (deskSettledInvoices.length === 0) {
      showToast('No desk settlement logs available to export.', 'info');
      return;
    }
    const headers = ["Invoice ID", "Resident Name", "Suite/Room", "Building", "Amount (€)", "Payment Method", "Channel", "Settlement Date", "Notes / Reference"];
    const rows = deskSettledInvoices.map(inv => [
      inv.id,
      `"${inv.tenantName}"`,
      `"${inv.roomNumber}"`,
      `"${inv.building || 'Main Facility'}"`,
      inv.totalAmount.toFixed(2),
      `"${inv.paymentMethod || 'Desk Terminal'}"`,
      `"${inv.paymentChannel || 'Desk'}"`,
      inv.paymentDate || inv.date,
      `"${inv.notes || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Desk_Settlement_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddActivity(
      'billing',
      'Exported Desk Settlement Log',
      `Staff exported ${deskSettledInvoices.length} physical desk payment logs to CSV.`
    );
  };

  const handleQuickDeskSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!quickDeskInvoiceId) {
      showToast('Please select a pending invoice to settle at desk.', 'error');
      return;
    }
    handleRecordPayment(quickDeskInvoiceId, quickDeskMethod, 'Desk', quickDeskNotes.trim() || undefined);
    setShowQuickDeskModal(false);
    setQuickDeskInvoiceId('');
    setQuickDeskNotes('');
  };

  // Submit manual invoice creation
  const handleCreateInvoice = (e: FormEvent) => {
    e.preventDefault();
    
    const tenant = tenants.find(t => t.id === formTenantId);
    if (!tenant) return;

    const extraSurcharge = tenant.hasExtraPerson ? 85.00 : 0;
    
    const subtotal = formRentAmount + extraSurcharge + Number(formAddonTotal) + Number(formDepositAmount) + Number(formAdminFee);
    const vatRate = 10; // standard housing rate
    const vatAmount = subtotal * (vatRate / 100);
    const totalAmount = subtotal + vatAmount;

    const newInvoice: Invoice = {
      id: `INV-${Math.floor(5000 + Math.random() * 4000)}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      building: tenant.building,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days due
      rentAmount: formRentAmount,
      extraPersonSurcharge: extraSurcharge,
      addOnTotal: Number(formAddonTotal),
      adminFee: Number(formAdminFee),
      depositAmount: Number(formDepositAmount),
      subtotal,
      vatRate,
      vatAmount,
      totalAmount,
      status: 'Pending'
    };

    onAddInvoice(newInvoice);
    onAddActivity(
      'billing',
      'Generated Manual Invoice',
      `Invoice ${newInvoice.id} generated for ${tenant.name}. Total billed: €${totalAmount.toFixed(2)} (VAT included).`
    );

    setShowAddInvoiceModal(false);
  };

  const handleUploadInvoice = (e: FormEvent) => {
    e.preventDefault();
    if (!uploadInvoiceNumber.trim() || !uploadPrice.trim() || !uploadedFileName) {
      showToast('Please fill out invoice number, price, and select a file.', 'error');
      return;
    }

    const tenant = tenants.find(t => t.id === uploadTenantId);
    if (!tenant) return;

    const priceVal = parseFloat(uploadPrice) || 0;
    
    // Subtotal and VAT calculations
    const vatRate = 10;
    const subtotal = priceVal / (1 + vatRate / 100);
    const vatAmount = priceVal - subtotal;

    const newInvoice: Invoice = {
      id: uploadInvoiceNumber.trim(),
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      building: tenant.building,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days due
      rentAmount: subtotal,
      extraPersonSurcharge: 0,
      addOnTotal: 0,
      adminFee: 0,
      depositAmount: 0,
      subtotal,
      vatRate,
      vatAmount,
      totalAmount: priceVal,
      status: 'Pending',
      invoiceFileName: uploadedFileName
    };

    onAddInvoice(newInvoice);
    onAddActivity(
      'billing',
      'Uploaded Monthly Rental Invoice',
      `Uploaded monthly rental invoice #${newInvoice.id} for ${tenant.name} - Amount: €${priceVal.toFixed(2)}. Document: ${uploadedFileName}`
    );

    showToast(`Monthly Rental Invoice #${uploadInvoiceNumber} for €${priceVal.toFixed(2)} uploaded successfully!`);

    // Reset fields
    setUploadInvoiceNumber('');
    setUploadPrice('');
    setUploadedFileName('');
    setShowUploadInvoiceModal(false);
  };

  const handleDownloadCSV = () => {
    // CSV headers matching properties of Invoice
    const headers = [
      'Invoice ID',
      'Tenant ID',
      'Tenant Name',
      'Suite/Room',
      'Building',
      'Issue Date',
      'Due Date',
      'Rent Amount (€)',
      'Extra Surcharge (€)',
      'Add-on Total (€)',
      'Admin Fee (€)',
      'Deposit Amount (€)',
      'Subtotal (€)',
      'VAT Rate (%)',
      'VAT Amount (€)',
      'Total Amount (€)',
      'Status',
      'Payment Method',
      'Payment Channel'
    ];

    const rows = filteredInvoices.map(inv => [
      inv.id,
      inv.tenantId,
      inv.tenantName,
      inv.roomNumber,
      inv.building,
      inv.date,
      inv.dueDate,
      (inv.rentAmount ?? 0).toFixed(2),
      (inv.extraPersonSurcharge || 0).toFixed(2),
      (inv.addOnTotal || 0).toFixed(2),
      (inv.adminFee || 0).toFixed(2),
      (inv.depositAmount || 0).toFixed(2),
      (inv.subtotal ?? 0).toFixed(2),
      inv.vatRate ?? 0,
      (inv.vatAmount ?? 0).toFixed(2),
      (inv.totalAmount ?? 0).toFixed(2),
      inv.status,
      inv.paymentMethod || 'Unpaid',
      inv.paymentChannel || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Seven_Rocks_Financial_Report_${filterPaymentStatus}_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddActivity(
      'billing',
      'Exported CSV Financial Report',
      `Downloaded financial CSV export of ${filteredInvoices.length} filtered invoices (${filterPaymentStatus} filter).`
    );
  };

  const handleSortClick = (column: SortColumn, isShiftKey: boolean) => {
    setSortRules(prevRules => {
      const index = prevRules.findIndex(r => r.column === column);
      
      if (isShiftKey) {
        if (index > -1) {
          const rule = prevRules[index];
          if (rule.direction === 'asc') {
            const updated = [...prevRules];
            updated[index] = { ...rule, direction: 'desc' };
            return updated;
          } else {
            return prevRules.filter(r => r.column !== column);
          }
        } else {
          return [...prevRules, { column, direction: 'asc' }];
        }
      } else {
        if (prevRules.length === 1 && prevRules[0].column === column) {
          return [{
            column,
            direction: prevRules[0].direction === 'asc' ? 'desc' : 'asc'
          }];
        } else {
          return [{ column, direction: 'asc' }];
        }
      }
    });
  };

  const renderSortableHeader = (column: SortColumn, label: string) => {
    const ruleIndex = sortRules.findIndex(r => r.column === column);
    const rule = ruleIndex > -1 ? sortRules[ruleIndex] : null;
    
    return (
      <th 
        onClick={(e) => handleSortClick(column, e.shiftKey)}
        className="px-6 py-4 whitespace-nowrap text-xs font-bold text-brand-stone uppercase tracking-wider cursor-pointer hover:bg-brand-surface/70 select-none group/header transition-colors"
        title={`Sort by ${label}. Hold Shift to add/toggle secondary sorting rules.`}
      >
        <div className="flex items-center space-x-1.5">
          <span>{label}</span>
          <span className="flex items-center space-x-0.5">
            {rule ? (
              <>
                {rule.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3 text-brand-primary font-bold" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-brand-primary font-bold" />
                )}
                {sortRules.length > 1 && (
                  <span className="text-[9px] bg-brand-primary text-white rounded-full h-3.5 w-3.5 flex items-center justify-center font-bold font-mono">
                    {ruleIndex + 1}
                  </span>
                )}
              </>
            ) : (
              <ArrowUpDown className="h-3 w-3 text-brand-stone/40 group-hover/header:text-brand-stone/80 transition-colors" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {ToastElement}
      
      {/* Visual financial health widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1: Collected */}
        <div className="bg-white p-5 rounded-2xl border border-brand-border shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-brand-surface text-brand-primary border border-brand-border">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-brand-stone tracking-wider">Total Revenue Collected</p>
              <h4 className="text-lg font-extrabold text-brand-dark font-mono">
                €{totalCollected.toLocaleString('en-IE', { minimumFractionDigits: 2 })}
              </h4>
            </div>
          </div>
          
          {/* Channels Breakdown */}
          <div className="pt-2 border-t border-brand-border/60 grid grid-cols-2 gap-2 text-[10.5px]">
            <div>
              <span className="text-brand-stone font-semibold">Paid Online:</span>
              <strong className="block text-emerald-800 font-mono">
                €{onlineCollected.toLocaleString('en-IE', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span className="text-brand-stone font-semibold">Paid at Desk:</span>
              <strong className="block text-brand-primary font-mono font-bold">
                €{deskCollected.toLocaleString('en-IE', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>

        {/* KPI 2: Outstanding */}
        <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Total Active Receivables</p>
            <h4 className="text-xl font-extrabold text-brand-dark font-mono">
              €{totalOutstanding.toLocaleString('en-IE', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[10px] text-amber-800 font-semibold font-sans mt-0.5">Includes pending & overdue invoices</p>
          </div>
        </div>

        {/* KPI 3: Occupancy Run-rate alert */}
        <div className="relative">
          {/* Solid shadow layer as a background */}
          <div className="absolute inset-0 bg-brand-primary/10 rounded-2xl translate-x-1.5 translate-y-1.5"></div>
          
          <div className="relative bg-brand-surface text-brand-dark p-6 rounded-2xl border border-brand-stone/60 flex items-center space-x-4 h-full">
            <div className="p-3.5 rounded-xl bg-brand-bg text-brand-primary border border-brand-stone/30">
              <Coins className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Seven Rocks Fiscal Efficiency</p>
              <h4 className="text-sm font-bold text-natural-dark-olive font-serif">VAT Compliance Rate: 10%</h4>
              <p className="text-[10px] text-brand-secondary font-medium">Residential rents fall under reduced 10% rate tier.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Background due-date scan status bar */}
      <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-brand-surface text-brand-primary border border-brand-border rounded-xl shrink-0">
            <ShieldCheck className="h-4.5 w-4.5 text-brand-primary" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h5 className="font-bold text-brand-dark text-xs font-serif">Automated Due-Date Monitor System</h5>
              <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold uppercase font-mono tracking-wider animate-pulse">
                Background Active (15s Polling)
              </span>
            </div>
            <p className="text-[10px] text-brand-stone font-semibold mt-0.5">
              {backgroundScanLog} <span className="text-brand-primary font-mono ml-1">Last scan: {lastCheckTime}</span>
            </p>
          </div>
        </div>

        {nearingInvoicesCount > 0 && (
          <button
            type="button"
            onClick={handleSendAllReminders}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-extrabold flex items-center space-x-1 transition-all shadow-xs cursor-pointer self-end md:self-auto"
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Auto-Send Reminders to All ({nearingInvoicesCount})</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Side: Invoice List Table - span 2 */}
        <div className="xl:col-span-2 space-y-4 min-w-0">
          
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-brand-border flex flex-col xl:flex-row xl:items-center justify-between gap-4 flex-wrap">
            <div className="flex space-x-1.5 overflow-x-auto">
              {['All', 'Paid', 'Pending', 'Overdue'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterPaymentStatus(status)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                    filterPaymentStatus === status
                      ? 'bg-brand-primary text-white border border-brand-primary'
                      : 'bg-brand-surface text-brand-secondary border border-brand-border hover:bg-[#E5E0D8]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setShowSortManager(!showSortManager)}
                className={`px-4 py-2 border rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  showSortManager || sortRules.length > 1
                    ? 'bg-brand-primary text-white border-brand-primary hover:bg-[#4E4E37]' 
                    : 'bg-brand-surface text-brand-primary hover:bg-[#E5E0D8] border border-brand-border'
                }`}
                title="Configure multi-column sorting rules"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                <span>Sort ({sortRules.length})</span>
              </button>

              <button 
                onClick={handleDownloadCSV}
                className="px-3 py-1.5 bg-brand-surface hover:bg-[#E5E0D8] text-brand-primary border border-brand-border rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Export current filtered list to CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Financial Report</span>
              </button>

              <button 
                onClick={() => setShowAddInvoiceModal(true)}
                className="px-3 py-1.5 bg-brand-primary hover:bg-[#4E4E37] text-white border border-brand-primary rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Raise Manual Invoice</span>
              </button>

              <button 
                onClick={() => setShowUploadInvoiceModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Upload Monthly Rental Invoice</span>
              </button>
            </div>
          </div>

          {/* Sort Manager Panel */}
          {showSortManager && (
            <div className="bg-brand-surface border border-brand-border p-4 rounded-2xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-brand-border pb-2">
                <div>
                  <h5 className="text-xs font-bold text-brand-dark uppercase tracking-wider font-sans">Multi-Column Sort Manager</h5>
                  <p className="text-[10px] text-brand-stone mt-0.5">Specify a sequence of sorting rules to organize large rosters. Rules are applied in priority order.</p>
                </div>
                <button 
                  onClick={() => setShowSortManager(false)}
                  className="text-brand-stone hover:text-brand-primary p-1 rounded-md hover:bg-white border border-transparent hover:border-brand-border transition-all cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* List of active sort rules */}
              <div className="space-y-2">
                {sortRules.map((rule, index) => {
                  return (
                    <div key={rule.column} className="flex flex-wrap items-center gap-2 bg-white p-2 border border-brand-border rounded-lg text-xs">
                      <span className="font-semibold text-brand-stone text-[10px] uppercase w-20">
                        {index === 0 ? 'Primary' : index === 1 ? 'Secondary' : 'Tertiary'} Sort:
                      </span>
                      
                      {/* Column select */}
                      <select
                        value={rule.column}
                        onChange={(e) => {
                          const newCol = e.target.value as SortColumn;
                          setSortRules(prev => {
                            const updated = [...prev];
                            const existingIdx = prev.findIndex(r => r.column === newCol);
                            if (existingIdx > -1) {
                              updated[existingIdx] = { column: rule.column, direction: prev[existingIdx].direction };
                            }
                            updated[index] = { column: newCol, direction: rule.direction };
                            return updated;
                          });
                        }}
                        className="px-2 py-1 border border-brand-border rounded bg-brand-surface font-semibold text-brand-primary outline-hidden cursor-pointer"
                      >
                        <option value="tenantName">Invoice / Resident</option>
                        <option value="date">Issue Date</option>
                        <option value="vatAmount">Tax (10% VAT)</option>
                        <option value="totalAmount">Total Amount</option>
                        <option value="status">Status</option>
                      </select>

                      {/* Direction toggle */}
                      <button
                        onClick={() => {
                          setSortRules(prev => {
                            const updated = [...prev];
                            updated[index] = { ...rule, direction: rule.direction === 'asc' ? 'desc' : 'asc' };
                            return updated;
                          });
                        }}
                        className="px-2.5 py-1 bg-brand-surface hover:bg-brand-bg text-brand-primary border border-brand-border rounded font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        {rule.direction === 'asc' ? (
                          <>
                            <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Ascending (A-Z, 1-9)</span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="h-3.5 w-3.5 text-natural-orange" />
                            <span>Descending (Z-A, 9-1)</span>
                          </>
                        )}
                      </button>

                      {/* Rule movement */}
                      <div className="flex items-center space-x-1 sm:ml-auto">
                        <button
                          disabled={index === 0}
                          onClick={() => {
                            setSortRules(prev => {
                              const updated = [...prev];
                              const temp = updated[index - 1];
                              updated[index - 1] = updated[index];
                              updated[index] = temp;
                              return updated;
                            });
                          }}
                          className="p-1 border border-brand-border rounded bg-brand-surface text-brand-secondary hover:text-brand-primary disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                          title="Increase priority"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          disabled={index === sortRules.length - 1}
                          onClick={() => {
                            setSortRules(prev => {
                              const updated = [...prev];
                              const temp = updated[index + 1];
                              updated[index + 1] = updated[index];
                              updated[index] = temp;
                              return updated;
                            });
                          }}
                          className="p-1 border border-brand-border rounded bg-brand-surface text-brand-secondary hover:text-brand-primary disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                          title="Decrease priority"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setSortRules(prev => prev.filter(r => r.column !== rule.column));
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 hover:border-red-200 border border-transparent rounded ml-1 cursor-pointer"
                          title="Remove sorting level"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                {sortRules.length < 5 ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-brand-stone font-semibold">Add Sorting Level:</span>
                    {(['tenantName', 'date', 'vatAmount', 'totalAmount', 'status'] as SortColumn[])
                      .filter(col => !sortRules.some(r => r.column === col))
                      .map(col => {
                        const label = col === 'tenantName' ? 'Invoice/Resident' : col === 'date' ? 'Issue Date' : col === 'vatAmount' ? 'Tax' : col === 'totalAmount' ? 'Total Amount' : 'Status';
                        return (
                          <button
                            key={col}
                            onClick={() => {
                              setSortRules(prev => [...prev, { column: col, direction: 'asc' }]);
                            }}
                            className="px-2 py-1 bg-white hover:bg-brand-surface text-brand-primary border border-brand-border rounded text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <span className="text-[11px] text-brand-stone italic font-semibold">All columns included in sort hierarchy.</span>
                )}

                <button
                  onClick={() => {
                    setSortRules([{ column: 'date', direction: 'desc' }]);
                  }}
                  className="text-[11px] font-bold text-brand-secondary hover:text-brand-primary underline cursor-pointer"
                >
                  Reset Default Sort
                </button>
              </div>
              
              <p className="text-[10px] text-brand-stone italic mt-1 font-medium bg-white p-2 rounded border border-brand-border/40">
                💡 <strong>Pro-Tip:</strong> You can set a single sort by clicking any table header. Hold <strong>Shift</strong> while clicking table headers to add or toggle secondary sorting rules instantly!
              </p>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-brand-surface border-b border-brand-border">
                  {renderSortableHeader('tenantName', 'Invoice / Resident')}
                  {renderSortableHeader('date', 'Issue Date')}
                  {renderSortableHeader('vatAmount', 'Tax (10% VAT)')}
                  {renderSortableHeader('totalAmount', 'Total Amount')}
                  {renderSortableHeader('status', 'Status')}
                  <th className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold text-brand-stone uppercase tracking-wider">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-xs">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-brand-stone italic">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isSelected = inv.id === selectedInvoiceId;
                    return (
                      <tr 
                        key={inv.id}
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className={`hover:bg-brand-surface/40 cursor-pointer transition-colors ${
                          isSelected ? 'bg-brand-surface' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg border ${
                              isSelected 
                                ? 'bg-brand-primary text-white border-brand-primary' 
                                : 'bg-brand-bg text-brand-secondary border-brand-border'
                            }`}>
                              <Receipt className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-brand-dark font-mono">{formatId(inv.id)}</p>
                              <p className="text-[10px] text-brand-stone">{inv.tenantName} ({inv.roomNumber})</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-brand-stone font-mono">
                          {inv.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-brand-secondary font-medium font-mono">
                          €{(inv.vatAmount ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-brand-dark font-mono">
                          €{(inv.totalAmount ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex items-center w-max px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              inv.status === 'Paid' 
                                ? 'bg-brand-surface text-brand-primary border-brand-border'
                                : inv.status === 'Pending'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {inv.status}
                            </span>
                            {inv.status === 'Pending' && getDaysRemaining(inv.dueDate) >= 0 && getDaysRemaining(inv.dueDate) <= 3 && (
                              <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 font-extrabold animate-pulse">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                <span>Nearing Due ({getDaysRemaining(inv.dueDate)}d)</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {inv.status !== 'Paid' && onAddNotification && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendReminder(inv);
                                }}
                                title="Auto-Send Reminder"
                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                              >
                                <Clock className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInvoiceId(inv.id);
                              }}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer border ${
                                isSelected 
                                  ? 'bg-brand-primary text-white border-brand-primary' 
                                  : 'bg-brand-surface border-brand-border text-brand-secondary hover:bg-brand-bg'
                              }`}
                            >
                              Breakdown
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

          {/* Dedicated Desk Settlement Log Section */}
          <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs space-y-5">
            {/* Header & Main Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-surface pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-brand-primary text-white rounded-lg">
                    <Building className="h-4 w-4" />
                  </span>
                  <h4 className="font-bold text-brand-dark text-base font-serif">Desk Settlement Log</h4>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold rounded-full">
                    Desk Settle Active
                  </span>
                </div>
                <p className="text-xs text-brand-stone">
                  Audit log of all physical payments (cash, card terminal, or manual receipts) processed by desk staff
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowQuickDeskModal(true)}
                  className="px-3 py-1.5 bg-brand-primary hover:bg-[#4E4E37] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-brand flex items-center space-x-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Desk Payment</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportDeskLog}
                  className="px-3 py-1.5 bg-brand-surface hover:bg-brand-bg border border-brand-border text-brand-secondary text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
                  title="Export Desk Settlement Log to CSV"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Desk Settlement Summary Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-brand-surface/60 border border-brand-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-brand-stone uppercase tracking-wider block">Total Desk Revenue</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-lg font-mono font-extrabold text-brand-primary">€{deskCollected.toFixed(2)}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">100% Desk</span>
                </div>
              </div>
              <div className="p-3.5 bg-brand-surface/60 border border-brand-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-brand-stone uppercase tracking-wider block">Total Desk Transactions</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-lg font-mono font-extrabold text-brand-dark">{deskSettledInvoices.length}</span>
                  <span className="text-[10px] text-brand-stone">Receipts Logged</span>
                </div>
              </div>
              <div className="p-3.5 bg-brand-surface/60 border border-brand-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-brand-stone uppercase tracking-wider block">Latest Desk Settle</span>
                <div className="text-xs font-mono font-bold text-brand-dark truncate">
                  {deskSettledInvoices[0]?.paymentDate || deskSettledInvoices[0]?.date || 'Today'}
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-brand-stone" />
                <input
                  type="text"
                  placeholder="Search desk settlements (Invoice #, Resident, Suite)..."
                  value={deskSearchTerm}
                  onChange={(e) => setDeskSearchTerm(e.target.value)}
                  className="w-full bg-brand-surface/50 border border-brand-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary placeholder-brand-stone/60"
                />
              </div>

              {/* Method filter buttons */}
              <div className="flex items-center space-x-1 bg-brand-surface p-1 rounded-xl border border-brand-border shrink-0">
                <button
                  type="button"
                  onClick={() => setDeskFilterMethod('All')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    deskFilterMethod === 'All' ? 'bg-brand-primary text-white' : 'text-brand-secondary hover:text-brand-dark'
                  }`}
                >
                  All Methods
                </button>
                <button
                  type="button"
                  onClick={() => setDeskFilterMethod('Terminal')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    deskFilterMethod === 'Terminal' ? 'bg-brand-primary text-white' : 'text-brand-secondary hover:text-brand-dark'
                  }`}
                >
                  Terminal / Card
                </button>
                <button
                  type="button"
                  onClick={() => setDeskFilterMethod('Cash')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    deskFilterMethod === 'Cash' ? 'bg-brand-primary text-white' : 'text-brand-secondary hover:text-brand-dark'
                  }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setDeskFilterMethod('Manual')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    deskFilterMethod === 'Manual' ? 'bg-brand-primary text-white' : 'text-brand-secondary hover:text-brand-dark'
                  }`}
                >
                  Manual Log
                </button>
              </div>
            </div>

            {/* List of Desk Settlements */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredDeskLogs.length === 0 ? (
                <div className="text-center py-8 bg-brand-surface/30 rounded-xl border border-dashed border-brand-border space-y-2">
                  <Building className="h-8 w-8 text-brand-stone/40 mx-auto" />
                  <p className="text-xs font-bold text-brand-dark">No desk settlements match filters</p>
                  <p className="text-[10px] text-brand-stone">Record a desk payment or adjust your search filter</p>
                  <button
                    type="button"
                    onClick={() => setShowQuickDeskModal(true)}
                    className="mt-2 inline-flex items-center space-x-1 px-3 py-1.5 bg-brand-primary text-white text-[10.5px] font-bold rounded-lg cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Process Desk Payment</span>
                  </button>
                </div>
              ) : (
                filteredDeskLogs.map((pLog) => (
                  <div 
                    key={`desk-log-${pLog.id}`}
                    onClick={() => setSelectedInvoiceId(pLog.id)}
                    className={`p-3.5 bg-brand-surface/40 hover:bg-brand-surface rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      selectedInvoiceId === pLog.id ? 'border-brand-primary bg-brand-surface ring-1 ring-brand-primary' : 'border-brand-border'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-white text-brand-primary border border-brand-border rounded-xl shadow-2xs shrink-0">
                        <Building className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-brand-dark text-xs">{formatId(pLog.id)}</span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-extrabold rounded">
                            {pLog.paymentMethod || 'Desk Terminal'}
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-secondary font-medium">
                          {pLog.tenantName} • <span className="font-semibold text-brand-dark">{pLog.roomNumber}</span> ({pLog.building || 'Main Building'})
                        </p>
                        <p className="text-[9.5px] text-brand-stone flex items-center space-x-1">
                          <ShieldCheck className="h-3 w-3 text-emerald-600 inline" />
                          <span>Physically processed at desk by staff</span>
                        </p>
                        {pLog.notes && (
                          <div className="text-[10px] text-brand-dark bg-amber-50/80 border border-amber-200/80 px-2 py-0.5 rounded-md inline-block font-medium mt-1">
                            <span className="font-bold text-amber-900">Note:</span> {pLog.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right sm:self-center shrink-0 border-t sm:border-t-0 border-brand-border/60 pt-2 sm:pt-0">
                      <span className="font-bold font-mono text-brand-primary text-sm block">+€{(pLog.totalAmount ?? 0).toFixed(2)}</span>
                      <span className="block text-[10px] text-brand-stone font-mono">{pLog.paymentDate || pLog.date}</span>
                      <span className="text-[9.5px] text-brand-primary font-bold hover:underline inline-block mt-0.5">
                        Inspect Breakdown &rarr;
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Side Detail Invoice Receipt Breakdown Column */}
        <div className="xl:col-span-1">
          {selectedInvoice ? (
            <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs space-y-5 sticky top-4 animate-scale-up">
              
              {/* Receipt Header */}
              <div className="border-b border-brand-border pb-4 space-y-2 text-center">
                <p className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Invoice Statement Breakdown</p>
                <h4 className="text-lg font-extrabold text-brand-dark font-mono">{formatId(selectedInvoice.id)}</h4>
                <div className="inline-flex items-center justify-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${
                    selectedInvoice.status === 'Paid' 
                      ? 'bg-brand-surface text-brand-primary border-brand-border'
                      : selectedInvoice.status === 'Pending'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
                  }`}>
                    {selectedInvoice.status} Statement
                  </span>
                </div>
              </div>

              {/* Resident details */}
              <div className="text-xs space-y-1 bg-brand-surface p-3 rounded-xl border border-brand-border">
                <div className="flex justify-between">
                  <span className="text-brand-stone font-semibold">Leaseholder:</span>
                  <strong className="text-brand-dark">{selectedInvoice.tenantName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-stone font-semibold">Suite:</span>
                  <span className="text-brand-dark font-mono">{selectedInvoice.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-stone font-semibold">Building:</span>
                  <span className="text-brand-secondary font-medium truncate max-w-[150px]">{selectedInvoice.building}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-stone font-semibold">Due Date:</span>
                  <span className="text-brand-secondary font-mono">{selectedInvoice.dueDate}</span>
                </div>
                {selectedInvoice.invoiceFileName && (
                  <div className="flex justify-between items-center pt-1.5 border-t border-brand-border/60">
                    <span className="text-brand-stone font-semibold">Attached Invoice:</span>
                    <button
                      onClick={() => showToast(`File preview: ${selectedInvoice.invoiceFileName}`, 'info')}
                      className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold underline flex items-center gap-1 cursor-pointer"
                    >
                      <Receipt className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[120px]">{selectedInvoice.invoiceFileName}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Itemized pricing items */}
              <div className="space-y-2">
                <h5 className="text-[10px] uppercase font-bold text-brand-stone tracking-wider font-sans">Itemized Rents & Services</h5>
                
                <div className="divide-y divide-brand-border text-xs">
                  {/* Base Rent */}
                  <div className="flex justify-between py-2">
                    <span className="text-brand-secondary">Monthly Base rent</span>
                    <span className="font-bold text-brand-dark font-mono">€{(selectedInvoice.rentAmount ?? 0).toFixed(2)}</span>
                  </div>

                  {/* Extra Person Surcharge */}
                  {selectedInvoice.extraPersonSurcharge > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-brand-secondary">Co-occupant Extra Surcharge</span>
                      <span className="font-bold text-brand-dark font-mono">€{(selectedInvoice.extraPersonSurcharge ?? 0).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Addon Subscriptions */}
                  {selectedInvoice.addOnTotal > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-brand-secondary">Add-on service bundle</span>
                      <span className="font-bold text-brand-dark font-mono">€{(selectedInvoice.addOnTotal ?? 0).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Move-in Fee */}
                  {selectedInvoice.adminFee > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-brand-secondary">One-time administrative fee</span>
                      <span className="font-bold text-brand-dark font-mono">€{(selectedInvoice.adminFee ?? 0).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Security deposit */}
                  {selectedInvoice.depositAmount > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-brand-secondary">Security Escrow Deposit</span>
                      <span className="font-bold text-brand-dark font-mono">€{(selectedInvoice.depositAmount ?? 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial calculations */}
              <div className="pt-3 border-t border-brand-border space-y-1.5 text-xs bg-brand-surface p-3 rounded-xl border border-brand-border">
                <div className="flex justify-between">
                  <span className="text-brand-secondary font-semibold">Subtotal (Excl. VAT)</span>
                  <span className="font-bold text-brand-dark font-mono">€{(selectedInvoice.subtotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-brand-secondary">
                  <span>Standard VAT (10%)</span>
                  <span className="font-semibold font-mono">€{(selectedInvoice.vatAmount ?? 0).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-brand-border flex justify-between font-extrabold text-brand-dark text-[13px]">
                  <span>Total Due (VAT Incl.)</span>
                  <span className="font-mono">€{(selectedInvoice.totalAmount ?? 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Auto-Send Reminder Action */}
              {selectedInvoice.status !== 'Paid' && onAddNotification && (
                <div className="pt-2 border-t border-brand-border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-brand-stone font-bold uppercase font-sans">Resident Notification</span>
                    {getDaysRemaining(selectedInvoice.dueDate) >= 0 && getDaysRemaining(selectedInvoice.dueDate) <= 3 && (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        Nearing Due
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendReminder(selectedInvoice)}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Auto-Send Reminder</span>
                  </button>
                </div>
              )}

              {/* Desk Settlement Actions */}
              {selectedInvoice.status !== 'Paid' && (
                <div className="space-y-2.5 pt-2">
                  <p className="text-[10px] text-brand-stone font-bold uppercase text-center font-sans">Settle Account balance</p>
                  <button
                    onClick={() => handleRecordPayment(selectedInvoice.id, 'Desk Terminal (Cash/Card)', 'Desk')}
                    className="w-full py-2.5 bg-brand-surface hover:bg-[#E5E0D8] border border-brand-border text-brand-primary text-[11px] font-bold rounded-xl transition-colors text-center cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <Building className="h-4 w-4" />
                    <span>Settle Paid at Desk (Cash/Card/Terminal)</span>
                  </button>
                </div>
              )}

              {selectedInvoice.status === 'Paid' && (
                <div className="pt-2 bg-brand-surface text-brand-primary border border-brand-border p-3 rounded-xl text-[11px] font-bold space-y-1 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span>Settled via {selectedInvoice.paymentMethod || 'Desk Terminal'}</span>
                  </div>
                  {selectedInvoice.notes && (
                    <p className="text-[10px] font-normal text-brand-stone italic border-t border-brand-border/60 pt-1 mt-1">
                      Ref/Notes: {selectedInvoice.notes}
                    </p>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="bg-brand-surface border-2 border-dashed border-brand-border rounded-2xl p-12 text-center text-brand-stone text-xs">
              Select an invoice to review VAT, surcharge, move-in fees, and settle accounts.
            </div>
          )}
        </div>

      </div>

      {/* Manual Invoice Raise Dialog */}
      {showAddInvoiceModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-brand-border max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-brand-dark text-base font-serif">Generate Special Statement</h3>
                <p className="text-xs text-brand-stone">Raise manually configured invoice for billing</p>
              </div>
              <button 
                onClick={() => setShowAddInvoiceModal(false)}
                className="text-brand-stone hover:text-brand-dark cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">Leaseholder Recipient</label>
                <select
                  value={formTenantId}
                  onChange={(e) => setFormTenantId(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.roomNumber})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-brand-stone">Base Rent (€)</label>
                  <input
                    type="number"
                    value={formRentAmount}
                    onChange={(e) => setFormRentAmount(Number(e.target.value))}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-semibold font-mono text-brand-dark focus:ring-1 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-brand-stone">Add-on Bundle Total (€)</label>
                  <input
                    type="number"
                    value={formAddonTotal}
                    onChange={(e) => setFormAddonTotal(Number(e.target.value))}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-semibold font-mono text-brand-dark focus:ring-1 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-brand-stone">Move-in Admin Fee (€)</label>
                  <input
                    type="number"
                    value={formAdminFee}
                    onChange={(e) => setFormAdminFee(Number(e.target.value))}
                    placeholder="Raise €90 if move-in"
                    className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-semibold font-mono text-brand-dark focus:ring-1 focus:ring-brand-primary focus:outline-none placeholder-brand-stone/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-brand-stone">Escrow Security Deposit (€)</label>
                  <input
                    type="number"
                    value={formDepositAmount}
                    onChange={(e) => setFormDepositAmount(Number(e.target.value))}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-semibold font-mono text-brand-dark focus:ring-1 focus:ring-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-brand-surface p-3 rounded-xl border border-brand-border space-y-1 text-brand-secondary leading-normal">
                <span className="font-bold text-brand-dark block text-[11px] font-serif">Dynamic Calculations:</span>
                <p>Reduced housing VAT rate of <strong className="text-brand-dark">10%</strong> is automatically calculated on top of subtotal sum and listed as itemized tax ledger.</p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddInvoiceModal(false)}
                  className="flex-1 py-2.5 bg-brand-surface hover:bg-brand-bg border border-brand-border text-brand-secondary rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Raise Invoice
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Monthly Rental Invoice Upload Dialog */}
      {showUploadInvoiceModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-brand-border max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-brand-dark text-base font-serif">Upload Monthly Rental Invoice</h3>
                <p className="text-xs text-brand-stone">Record monthly rental billing receipt & file attachment</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowUploadInvoiceModal(false)}
                className="text-brand-stone hover:text-brand-dark cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadInvoice} className="space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">Leaseholder Recipient</label>
                <select
                  value={uploadTenantId}
                  onChange={(e) => setUploadTenantId(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.roomNumber})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-brand-stone">Monthly Invoice # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RNT-2026-07"
                    value={uploadInvoiceNumber}
                    onChange={(e) => setUploadInvoiceNumber(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-semibold font-mono text-brand-dark focus:ring-1 focus:ring-brand-primary focus:outline-none placeholder-brand-stone/55"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-brand-stone">Monthly Rental Amount (€) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 1450.00"
                    value={uploadPrice}
                    onChange={(e) => setUploadPrice(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-semibold font-mono text-brand-dark focus:ring-1 focus:ring-brand-primary focus:outline-none placeholder-brand-stone/55"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone mb-1 uppercase tracking-wider">Upload Rental Agreement / Invoice PDF *</label>
                <div className="relative">
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadedFileName(file.name);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full bg-[#FAF9F6] hover:bg-brand-surface border-2 border-dashed border-brand-border rounded-xl p-6 flex flex-col items-center justify-center space-y-1 text-center cursor-pointer transition-colors">
                    <Receipt className="h-6 w-6 text-brand-primary" />
                    <span className="text-xs font-bold text-brand-dark">
                      {uploadedFileName ? `Selected: ${uploadedFileName}` : "Drag & Drop or click to browse files"}
                    </span>
                    <span className="text-[10px] text-brand-stone">Accepts PDF, DOCX, PNG, JPG</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadInvoiceModal(false)}
                  className="flex-1 py-2.5 bg-brand-surface hover:bg-brand-bg border border-brand-border text-brand-secondary rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Save & Upload
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Quick Desk Settlement Process Modal */}
      {showQuickDeskModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-brand-border max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start border-b border-brand-surface pb-3">
              <div>
                <h3 className="font-bold text-brand-dark text-base font-serif">Process Desk Settlement</h3>
                <p className="text-xs text-brand-stone">Log manual cash or card payment at reception desk</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowQuickDeskModal(false)}
                className="text-brand-stone hover:text-brand-dark cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickDeskSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">Select Pending Invoice *</label>
                <select
                  value={quickDeskInvoiceId}
                  onChange={(e) => setQuickDeskInvoiceId(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  required
                >
                  <option value="">-- Choose Pending / Overdue Invoice --</option>
                  {invoices.filter(inv => inv.status !== 'Paid').map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {formatId(inv.id)} - {inv.tenantName} ({inv.roomNumber}) - €{(inv.totalAmount ?? 0).toFixed(2)} [{inv.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">Physical Settlement Method *</label>
                <select
                  value={quickDeskMethod}
                  onChange={(e) => setQuickDeskMethod(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="Desk Terminal (Cash/Card)">Desk Terminal (Physical Card / Contactless)</option>
                  <option value="Desk Cash Receipt">Desk Cash Settle (Physical Cash)</option>
                  <option value="Desk Manual Receipt">Desk Manual Settle (Bank/Cheque/Other)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">Optional Notes / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Check #123, Received by: John, Receipt #456"
                  value={quickDeskNotes}
                  onChange={(e) => setQuickDeskNotes(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary placeholder-brand-stone/40"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                <p className="font-bold">Staff Audit Confirmation:</p>
                Logging this settlement marks the invoice as <strong>Paid</strong> and updates the resident portal invoice status immediately.
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickDeskModal(false)}
                  className="flex-1 py-2.5 bg-brand-surface hover:bg-brand-bg border border-brand-border text-brand-secondary rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-brand flex items-center justify-center space-x-1"
                >
                  <Building className="h-4 w-4" />
                  <span>Confirm Desk Settle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
