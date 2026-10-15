import React, { useState, useRef, useCallback } from 'react';
import { useToast } from '../lib/useToast';
import { useDialog } from '../lib/useDialog';
import { formatId } from '../lib/formatId';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileCheck, 
  Plus, 
  Minus, 
  Calendar, 
  Euro, 
  Sparkles,
  AlertCircle,
  X,
  Clock,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Eye,
  FileText,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Printer,
  Download,
  AlertTriangle,
  Search,
  Shield,
  UploadCloud,
  Trash2,
  Paperclip,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { Tenant, ContractExtensionRequest, Invoice, SupportTicket } from '../types';

interface TenantsViewProps {
  tenants: Tenant[];
  searchTerm: string;
  onUpdateTenant: (updatedTenant: Tenant) => void;
  onDeleteTenant?: (tenantId: string) => void;
  onAddActivity: (type: 'tenant' | 'billing' | 'addon' | 'ticket' | 'notification', action: string, details: string) => void;
  onOpenQuickAddTenant: () => void;
  extensionRequests?: ContractExtensionRequest[];
  onApproveExtensionRequest?: (requestId: string) => void;
  onRejectExtensionRequest?: (requestId: string, notes?: string) => void;
  invoices?: Invoice[];
  tickets?: SupportTicket[];
}

export type SortColumn = 'name' | 'room' | 'status';

export interface SortRule {
  column: SortColumn;
  direction: 'asc' | 'desc';
}

export default function TenantsView({ 
  tenants, 
  searchTerm, 
  onUpdateTenant, 
  onDeleteTenant,
  onAddActivity,
  onOpenQuickAddTenant,
  extensionRequests = [],
  onApproveExtensionRequest,
  onRejectExtensionRequest,
  invoices = [],
  tickets = []
}: TenantsViewProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(tenants[0]?.id || null);
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionMonths, setExtensionMonths] = useState(3);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [sortRules, setSortRules] = useState<SortRule[]>([
    { column: 'name', direction: 'asc' }
  ]);
  const [showSortManager, setShowSortManager] = useState(false);

  const { showToast, ToastElement } = useToast();
  const { promptDialog, confirmDialog, DialogElement } = useDialog();

  const handleSendOnboardingLink = async (tenantId: string, email: string, name: string) => {
    try {
      showToast(`Sending onboarding email to ${name}...`, 'info');
      const res = await fetch(`/api/tenants/${tenantId}/send-onboarding`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.error || 'Failed to send onboarding email', 'error');
      } else {
        showToast(`Onboarding email sent to ${email}!`, 'success');
        onAddActivity('tenant', 'Onboarding Email Sent', `Sent onboarding invitation email to ${name} (${email}).`);
      }
    } catch (err: any) {
      showToast('Failed to send onboarding email. Please try again.', 'error');
    }
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

  const handleDownloadCSV = () => {
    // CSV headers
    const headers = [
      'ID',
      'Name',
      'Email',
      'Phone',
      'Suite/Room',
      'Building/Location',
      'Property Type',
      'Status',
      'Start Date',
      'End Date',
      'Lease Duration (Months)',
      'Monthly Rent (€)',
      'Security Deposit (€)',
      'Deposit Status'
    ];

    // CSV rows
    const rows = sortedAndFilteredTenants.map(t => [
      t.id,
      t.name,
      t.email,
      t.phone,
      t.roomNumber,
      t.propertyLocation || t.building,
      t.propertyType || 'Co-Living',
      t.status,
      t.contractStartDate,
      t.contractEndDate,
      t.contractLengthMonths,
      t.monthlyRent,
      t.depositAmount,
      t.depositStatus
    ]);

    // Escape values and join
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => {
        const strVal = val === undefined || val === null ? '' : String(val);
        // Escape quotes
        const escaped = strVal.replace(/"/g, '""');
        // Wrap in quotes if it contains commas, quotes, or newlines
        return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `resident_directory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onAddActivity(
      'tenant',
      'Exported Resident Directory',
      `Admin exported directory for ${sortedAndFilteredTenants.length} residents to a CSV spreadsheet.`
    );
  };

  const handleRowClick = (tenantId: string) => {
    handleSelectTenant(tenantId);
    setExpandedTenantId(prev => prev === tenantId ? null : tenantId);
  };

  // Unit Assignment states
  const [assignRoomNum, setAssignRoomNum] = useState('');
  const [assignBuilding, setAssignBuilding] = useState('Berlin Mitte Central');
  const [assignPropertyType, setAssignPropertyType] = useState('Co-Living');
  const [assignPropertyLocation, setAssignPropertyLocation] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignEndDate, setAssignEndDate] = useState('');
  const [isEditingLease, setIsEditingLease] = useState(false);

  // Handover & Inventory Addition States
  const [newInvName, setNewInvName] = useState('');
  const [newInvQty, setNewInvQty] = useState(1);
  const [newInvCondition, setNewInvCondition] = useState<'Good' | 'Fair' | 'Needs Replacement'>('Good');

  // Effect to sync states when selected tenant changes
  React.useEffect(() => {
    const selected = tenants.find(t => t.id === selectedTenantId);
    if (selected) {
      setAssignRoomNum(selected.roomNumber || '');
      setAssignBuilding(selected.propertyLocation || selected.building || 'Berlin Mitte Central');
      setAssignPropertyType(selected.propertyType || 'Co-Living');
      setAssignPropertyLocation(selected.propertyLocation || selected.building || '');
      setAssignStartDate(selected.contractStartDate || '2026-07-09');
      setAssignEndDate(selected.contractEndDate || '2027-01-09');
      setIsEditingLease(false);
    }
  }, [selectedTenantId, tenants]);

  // Document Vault preview states
  const [activePreviewDoc, setActivePreviewDoc] = useState<{
    fileName: string;
    docType: 'id' | 'contract';
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(true);
  const [showRejectionForm, setShowRejectionForm] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // --- Drag and Drop File Upload States ---
  const [isDragging, setIsDragging] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<'contract' | 'id' | 'other'>('contract');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailViewRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processUploadedFile(files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    if (!selectedTenant) return;
    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    const uploadDate = new Date().toISOString().split('T')[0];

    if (uploadDocType === 'contract') {
      const updated: Tenant = {
        ...selectedTenant,
        contractFileName: file.name,
        contractVerified: undefined
      };
      onUpdateTenant(updated);
      onAddActivity(
        'tenant',
        'Uploaded Lease Contract',
        `Admin uploaded lease contract "${file.name}" (${sizeStr}) for resident ${selectedTenant.name}.`
      );
    } else if (uploadDocType === 'id') {
      const updated: Tenant = {
        ...selectedTenant,
        idDocumentUrl: file.name,
        idDocumentVerified: undefined
      };
      onUpdateTenant(updated);
      onAddActivity(
        'tenant',
        'Uploaded ID Document',
        `Admin uploaded ID document "${file.name}" (${sizeStr}) for resident ${selectedTenant.name}.`
      );
    } else {
      const newDoc = {
        name: file.name,
        uploadedAt: uploadDate,
        size: sizeStr
      };
      const currentDocs = selectedTenant.additionalDocs || [];
      const updated: Tenant = {
        ...selectedTenant,
        additionalDocs: [...currentDocs, newDoc]
      };
      onUpdateTenant(updated);
      onAddActivity(
        'tenant',
        'Uploaded Compliance Document',
        `Admin uploaded additional document "${file.name}" (${sizeStr}) for resident ${selectedTenant.name}.`
      );
    }
  };

  const handleDeleteAdditionalDoc = (docName: string) => {
    if (!selectedTenant) return;
    const currentDocs = selectedTenant.additionalDocs || [];
    const updated: Tenant = {
      ...selectedTenant,
      additionalDocs: currentDocs.filter(d => d.name !== docName)
    };
    onUpdateTenant(updated);
    onAddActivity(
      'tenant',
      'Deleted Compliance Document',
      `Admin deleted additional document "${docName}" from ${selectedTenant.name}'s profile.`
    );
  };

  const handleSelectTenant = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setTimeout(() => {
      if (window.innerWidth < 1280) {
        detailViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Filter tenants by search term and status
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.building.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'All') return matchesSearch;
    return matchesSearch && t.status === filterStatus;
  });

  // Sort the filtered tenants based on active sortRules hierarchy
  const sortedAndFilteredTenants = [...filteredTenants].sort((a, b) => {
    const activeRules = sortRules.length > 0 ? sortRules : [{ column: 'name', direction: 'asc' } as const];
    for (const rule of activeRules) {
      let comp = 0;
      if (rule.column === 'name') {
        comp = a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
      } else if (rule.column === 'room') {
        const rA = a.roomNumber || '';
        const rB = b.roomNumber || '';
        comp = rA.localeCompare(rB, undefined, { numeric: true, sensitivity: 'base' });
      } else if (rule.column === 'status') {
        comp = a.status.localeCompare(b.status, undefined, { sensitivity: 'base' });
      }

      if (comp !== 0) {
        return rule.direction === 'asc' ? comp : -comp;
      }
    }
    return 0;
  });

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  // Helper for deposit description
  const getDepositRuleText = (months: number) => {
    if (months < 6) return "Short-stay (1.5x Rent Deposit)";
    return "Standard long-stay (2x Rent Deposit)";
  };

  // Handle contract extension
  const handleExtendContract = () => {
    if (!selectedTenant) return;
    
    const currentLength = selectedTenant.contractLengthMonths;
    const newLength = currentLength + extensionMonths;
    
    // Calculate new end date based on original end date
    const origEndDate = new Date(selectedTenant.contractEndDate);
    origEndDate.setMonth(origEndDate.getMonth() + extensionMonths);
    const newEndDateStr = origEndDate.toISOString().split('T')[0];

    // Recompute deposit requirement based on new length
    const depositMultiplier = newLength < 6 ? 1.5 : 2;
    const newDepositAmount = selectedTenant.monthlyRent * depositMultiplier;

    const updated: Tenant = {
      ...selectedTenant,
      contractLengthMonths: newLength,
      contractEndDate: newEndDateStr,
      depositAmount: newDepositAmount,
    };

    onUpdateTenant(updated);
    onAddActivity(
      'tenant', 
      'Contract Extension Processed', 
      `${selectedTenant.name} extended by ${extensionMonths} months. Total lease: ${newLength}m. Deposit requirement updated to €${newDepositAmount}.`
    );
    
    setShowExtensionModal(false);
  };

  // Handle cancellation processing
  const handleProcessCancellation = () => {
    if (!selectedTenant) return;

    const updated: Tenant = {
      ...selectedTenant,
      status: 'Checked-Out',
      contractEndDate: new Date().toISOString().split('T')[0] // Set end date to today
    };

    onUpdateTenant(updated);
    onAddActivity(
      'tenant', 
      'Resident Terminated Lease', 
      `${selectedTenant.name} checked out from ${selectedTenant.roomNumber} (${selectedTenant.building}).`
    );

    setShowCancelModal(false);
  };

  // Toggle Extra Person Surcharge (€85/mo)
  const handleToggleExtraPerson = () => {
    if (!selectedTenant) return;

    const updated: Tenant = {
      ...selectedTenant,
      hasExtraPerson: !selectedTenant.hasExtraPerson,
      extraPersonName: !selectedTenant.hasExtraPerson ? 'Registered Co-occupant' : undefined
    };

    onUpdateTenant(updated);
    onAddActivity(
      'billing', 
      'Co-occupancy Surcharge Modified', 
      `${selectedTenant.name}: Surcharge of €85.00/month ${!selectedTenant.hasExtraPerson ? 'ENABLED' : 'DISABLED'}.`
    );
  };

  const renderSortableHeader = (column: SortColumn, label: string) => {
    const ruleIndex = sortRules.findIndex(r => r.column === column);
    const rule = ruleIndex > -1 ? sortRules[ruleIndex] : null;
    
    return (
      <th 
        onClick={(e) => handleSortClick(column, e.shiftKey)}
        className="px-6 py-4 text-xs font-bold text-brand-stone uppercase tracking-wider cursor-pointer hover:bg-brand-surface/70 select-none group/header transition-colors"
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
    <div className="space-y-6 animate-fade-in">
      {ToastElement}
      <DialogElement />
        
        {/* Pending Extension Requests Admin Review Section */}
        {extensionRequests && extensionRequests.length > 0 && (
          <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-xs font-bold text-brand-dark uppercase tracking-wide flex items-center gap-1.5 font-sans">
                  <Sparkles className="h-4.5 w-4.5 text-brand-primary" />
                  <span>Stay Extension Requests</span>
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200 rounded-lg">
                {extensionRequests.filter(r => r.status === 'Pending').length} Pending Review
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {extensionRequests.map((req) => (
                <div 
                  key={req.id} 
                  className={`p-4 rounded-xl border transition-all duration-500 ease-in-out ${
                    req.status === 'Pending' 
                      ? 'bg-amber-50/45 border-amber-200/80 shadow-xs' 
                      : req.status === 'Approved'
                      ? 'bg-emerald-50/25 border-emerald-100 shadow-sm scale-[1.01]'
                      : 'bg-slate-50/50 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand-dark">{req.tenantName}</span>
                        <span className="text-[10px] bg-white border border-brand-border text-brand-secondary px-1.5 py-0.5 rounded font-mono">
                          {req.roomNumber} ({req.building})
                        </span>
                      </div>
                      <p className="text-[10px] text-brand-secondary">
                        Current lease checkout: <span className="font-semibold font-mono text-brand-dark">{req.currentEndDate}</span> &rarr; Proposed checkout: <span className="font-semibold font-mono text-brand-primary">{req.newEndDate}</span>
                      </p>
                      <p className="text-[10px] text-brand-dark">
                        Requested stay addition: <span className="font-bold">+{req.requestedDurationMonths} Months</span>
                      </p>
                      {req.notes && (
                        <p className="text-[10px] text-brand-secondary italic mt-2 bg-white/60 p-2 rounded-lg border border-brand-border/40 leading-relaxed">
                          &ldquo;{req.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-brand-stone">Submitted: {req.requestDate}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border transition-all duration-500 ease-in-out ${
                          req.status === 'Pending' 
                            ? 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' 
                            : req.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 scale-105'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      {req.status === 'Pending' && (
                        <div className="flex items-center gap-2 mt-3 sm:mt-auto">
                          {onRejectExtensionRequest && (
                            <button
                              onClick={async () => {
                                const reason = await promptDialog("Decline Extension", "Enter rejection reason (optional):", "e.g., Suite not available");
                                if (reason !== null) {
                                  onRejectExtensionRequest(req.id, reason);
                                }
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                          )}
                          {onApproveExtensionRequest && (
                            <button
                              onClick={() => onApproveExtensionRequest(req.id)}
                              className="px-2.5 py-1 text-[10px] font-bold text-white bg-brand-primary hover:bg-[#4E4E37] border border-brand-primary rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Check className="h-3 w-3" />
                              <span>Approve Stay</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table Filters & Control Header */}
        <div className="w-full bg-white p-4 rounded-2xl border border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center flex-wrap gap-2">
            {['All', 'Checked-In', 'Pending', 'Checked-Out'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterStatus === status
                    ? 'bg-brand-primary text-white'
                    : 'bg-brand-surface text-brand-secondary hover:bg-[#E5E0D8] hover:text-brand-primary border border-brand-border'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="flex items-center flex-wrap gap-2 shrink-0">
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
              className="px-4 py-2 bg-brand-surface hover:bg-[#E5E0D8] text-brand-primary border border-brand-border rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              title="Download resident list in CSV format"
            >
              <Download className="h-3.5 w-3.5 text-natural-orange shrink-0" />
              <span>Export CSV</span>
            </button>
            <button 
              onClick={onOpenQuickAddTenant}
              className="px-4 py-2 bg-brand-surface text-brand-primary hover:bg-[#E5E0D8] border border-brand-border rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Add New Lease</span>
            </button>
          </div>
        </div>

        {/* Multi-Column Sort Manager Panel */}
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
                          // Swap columns if the column is already used elsewhere
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
                      <option value="name">Tenant Name</option>
                      <option value="room">Suite / Room Number</option>
                      <option value="status">Lease Status</option>
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

                    {/* Rule movement (reorder priority) */}
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
                      
                      {/* Delete rule */}
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

            {/* Add new sort rule row */}
            <div className="flex items-center justify-between pt-1">
              {sortRules.length < 3 ? (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-brand-stone font-semibold">Add Sorting Level:</span>
                  {(['name', 'room', 'status'] as SortColumn[])
                    .filter(col => !sortRules.some(r => r.column === col))
                    .map(col => {
                      const label = col === 'name' ? 'Tenant Name' : col === 'room' ? 'Suite / Room' : 'Lease Status';
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
                  setSortRules([{ column: 'name', direction: 'asc' }]);
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

        {/* Main Grid Layout: Left Table (col-span-2) & Right Detail Drawer (col-span-1) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column (Data Table) */}
          <div className="xl:col-span-2 space-y-4">
            {/* Directory Table */}
            <div className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-surface border-b border-brand-border">
                  {renderSortableHeader('name', 'Tenant')}
                  {renderSortableHeader('room', 'Suite / Building')}
                  {renderSortableHeader('status', 'Status')}
                  <th className="px-6 py-4 text-xs font-bold text-brand-stone uppercase tracking-wider">Lease Length</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-brand-stone uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {sortedAndFilteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-brand-stone text-sm">
                      No residents found matching the filters.
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredTenants.map((t) => {
                    const isSelected = t.id === selectedTenantId;
                    const isExpanded = t.id === expandedTenantId;
                    return (
                      <React.Fragment key={t.id}>
                        <tr 
                          onClick={() => handleRowClick(t.id)}
                          className={`group hover:bg-brand-surface/40 cursor-pointer transition-colors ${
                            isSelected ? 'bg-brand-surface font-medium' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {/* Expand/Collapse Chevron Indicator */}
                              <div className="text-brand-stone hover:text-brand-primary transition-colors shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                              <div className={`h-9 w-9 shrink-0 aspect-square rounded-full flex items-center justify-center font-bold text-xs ${
                                isSelected 
                                  ? 'bg-brand-primary text-white' 
                                  : 'bg-brand-surface text-brand-primary border border-brand-border group-hover:bg-[#E5E0D8]'
                              }`}>
                                {t.name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-brand-dark">{t.name}</p>
                                <p className="text-[10px] text-brand-stone font-mono font-semibold">{formatId(t.id)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-brand-dark">{t.roomNumber}</p>
                            <p className="text-[10px] text-brand-secondary">{t.building}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 ${
                              t.status === 'Checked-In' 
                                ? 'bg-brand-surface text-brand-primary border border-brand-border' 
                                : t.status === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-brand-bg text-brand-secondary border border-brand-border'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-semibold text-brand-dark font-mono">{t.contractLengthMonths} months</span>
                              <span className="text-[10px] text-brand-secondary font-medium">({t.contractLengthMonths >= 6 ? '>=6m' : '<6m'})</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(t.id);
                              }}
                              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                                isSelected 
                                  ? 'bg-brand-primary text-white border-brand-primary' 
                                  : 'bg-white text-brand-secondary border-brand-border hover:bg-brand-bg'
                              }`}
                            >
                              View File
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-[#FAF9F6] border-t border-b border-brand-border/60">
                            <td colSpan={5} className="px-6 py-5">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in text-brand-dark">
                                
                                {/* Col 1: Resident Mini-Profile */}
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-2 pb-2 border-b border-brand-border/60">
                                    <User className="h-4 w-4 text-brand-primary" />
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-stone font-mono">Resident Profile</h4>
                                  </div>
                                  <div className="space-y-2.5 text-[11px]">
                                    <div className="flex items-center space-x-2 text-brand-dark">
                                      <Mail className="h-3.5 w-3.5 text-brand-stone shrink-0" />
                                      <span className="font-medium truncate" title={t.email}>{t.email}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-brand-dark">
                                      <Phone className="h-3.5 w-3.5 text-brand-stone shrink-0" />
                                      <span className="font-medium">{t.phone}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-brand-dark">
                                      <Calendar className="h-3.5 w-3.5 text-brand-stone shrink-0" />
                                      <span>Lease: <span className="font-mono font-bold text-brand-primary">{t.contractStartDate}</span> &rarr; <span className="font-mono font-bold text-brand-primary">{t.contractEndDate}</span></span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-brand-dark">
                                      <Euro className="h-3.5 w-3.5 text-brand-stone shrink-0" />
                                      <span>Monthly Rent: <span className="font-bold">€{t.monthlyRent}</span></span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-brand-dark">
                                      <ShieldCheck className="h-3.5 w-3.5 text-brand-stone shrink-0" />
                                      <span>Security Deposit: <span className="font-bold">€{t.depositAmount}</span> 
                                        <span className={`ml-1.5 px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                                          t.depositStatus === 'Paid' 
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                            : t.depositStatus === 'Pending' || t.depositStatus === 'Unpaid'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : 'bg-slate-50 text-slate-700 border border-slate-200'
                                        }`}>{t.depositStatus}</span>
                                      </span>
                                    </div>
                                    {t.activeAddOns && t.activeAddOns.length > 0 && (
                                      <div className="pt-2 border-t border-brand-border/40">
                                        <span className="text-[10px] font-bold text-brand-stone block mb-1 font-mono uppercase tracking-wider">Active Amenities:</span>
                                        <div className="flex flex-wrap gap-1">
                                          {t.activeAddOns.map(addon => (
                                            <span key={addon} className="px-1.5 py-0.5 bg-brand-surface border border-brand-border text-brand-secondary rounded text-[9px] font-semibold">
                                              {addon}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Col 2: Recent Invoice History */}
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-2 pb-2 border-b border-brand-border/60">
                                    <FileText className="h-4 w-4 text-brand-primary" />
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-stone font-mono">Invoice History</h4>
                                  </div>
                                  <div className="space-y-2">
                                    {invoices.filter(inv => inv.tenantId === t.id).length === 0 ? (
                                      <p className="text-[11px] text-brand-stone italic py-2">No invoices issued yet.</p>
                                    ) : (
                                      invoices
                                        .filter(inv => inv.tenantId === t.id)
                                        .slice(0, 3)
                                        .map(inv => (
                                          <div key={inv.id} className="p-2.5 bg-white border border-brand-border/50 rounded-xl flex items-center justify-between text-[11px]">
                                            <div className="space-y-0.5">
                                              <p className="font-bold text-brand-dark font-mono">{formatId(inv.id)}</p>
                                              <p className="text-[10px] text-brand-stone font-mono">{inv.dueDate}</p>
                                            </div>
                                            <div className="text-right space-y-1">
                                              <p className="font-bold text-brand-dark">€{inv.totalAmount.toFixed(2)}</p>
                                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                inv.status === 'Paid'
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                  : inv.status === 'Pending'
                                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                                              }`}>
                                                {inv.status}
                                              </span>
                                            </div>
                                          </div>
                                        ))
                                    )}
                                  </div>
                                </div>

                                {/* Col 3: Active Support Tickets */}
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-2 pb-2 border-b border-brand-border/60">
                                    <AlertTriangle className="h-4 w-4 text-brand-primary" />
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-stone font-mono">Support Tickets</h4>
                                  </div>
                                  <div className="space-y-2">
                                    {tickets.filter(tick => tick.tenantId === t.id).length === 0 ? (
                                      <p className="text-[11px] text-brand-stone italic py-2">No active tickets.</p>
                                    ) : (
                                      tickets
                                        .filter(tick => tick.tenantId === t.id)
                                        .slice(0, 3)
                                        .map(tick => (
                                          <div key={tick.id} className="p-2.5 bg-white border border-brand-border/50 rounded-xl space-y-1.5 text-[11px]">
                                            <div className="flex items-start justify-between gap-1.5">
                                              <p className="font-bold text-brand-dark truncate max-w-[70%]" title={tick.subject}>{tick.subject}</p>
                                              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${
                                                tick.priority === 'High'
                                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                  : tick.priority === 'Medium'
                                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                  : 'bg-slate-50 text-slate-700 border border-slate-200'
                                              }`}>
                                                {tick.priority}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[9.5px] text-brand-stone">
                                              <span className="font-mono">{tick.category}</span>
                                              <span className={`font-semibold ${
                                                tick.status === 'Open'
                                                  ? 'text-rose-600'
                                                  : tick.status === 'In Progress'
                                                  ? 'text-amber-600'
                                                  : 'text-emerald-600'
                                              }`}>{tick.status}</span>
                                            </div>
                                          </div>
                                        ))
                                    )}
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column (Resident Detail Drawer/View) */}
      <div ref={detailViewRef} className="xl:col-span-1">
        {selectedTenant ? (
          <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs space-y-6 sticky top-4">
            
            {/* Actions Block: Onboarding & Deletion */}
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => handleSendOnboardingLink(selectedTenant.id, selectedTenant.email, selectedTenant.name)}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer group"
                title="Send onboarding invitation email to resident"
              >
                <Mail className="h-4 w-4 text-emerald-300 group-hover:scale-110 transition-transform" />
                <span>Send Onboarding Email</span>
              </button>
              {onDeleteTenant && (
                <button
                  type="button"
                  onClick={() => onDeleteTenant(selectedTenant.id)}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer group"
                >
                  <Trash2 className="h-4 w-4 text-rose-600 group-hover:scale-110 transition-transform" />
                  <span>Delete Client</span>
                </button>
              )}
            </div>

            {/* 0. Assign Unit Alert & Form (ONLY for Pending Tenants) */}
            {selectedTenant.status === 'Pending' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-start space-x-2.5">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-900 font-serif">Pending Suite Allocation</h5>
                    <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                      This resident is awaiting suite assignment to gain portal access and start checked-in co-living features.
                    </p>
                  </div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!assignRoomNum.trim()) {
                    showToast('Please enter a valid Room/Suite number.', 'error');
                    return;
                  }
                  const checkinDate = new Date(assignStartDate);
                  const checkoutDate = new Date(assignEndDate);
                  
                  if (checkoutDate.getTime() <= checkinDate.getTime()) {
                    showToast('Check-out date must be after check-in date.', 'error');
                    return;
                  }

                  const diffMs = checkoutDate.getTime() - checkinDate.getTime();
                  const calculatedLength = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4)));
                  const depositMultiplier = calculatedLength < 6 ? 1.5 : 2;
                  const calculatedDeposit = selectedTenant.monthlyRent * depositMultiplier;

                  const updated: Tenant = {
                    ...selectedTenant,
                    roomNumber: assignRoomNum.trim(),
                    building: assignPropertyLocation.trim() || 'Berlin Mitte Central',
                    propertyType: assignPropertyType,
                    propertyLocation: assignPropertyLocation.trim(),
                    contractStartDate: assignStartDate,
                    contractEndDate: assignEndDate,
                    contractLengthMonths: calculatedLength,
                    depositAmount: calculatedDeposit,
                    status: 'Checked-In'
                  };
                  onUpdateTenant(updated);
                  onAddActivity(
                    'tenant',
                    'Assigned Unit & Checked-In',
                    `Admin approved application & checked-in ${selectedTenant.name}. Assigned ${assignPropertyType} at ${assignPropertyLocation.trim() || 'Berlin Mitte Central'} (Unit: ${assignRoomNum.trim()}) for dates ${assignStartDate} to ${assignEndDate} (${calculatedLength} months).`
                  );
                  showToast(`Room ${assignRoomNum.trim()} allocated to ${selectedTenant.name}! Move-In Escrow Invoice generated.`);
                  setAssignRoomNum('');
                }} className="space-y-3">
                  
                  {/* Property Type and Location (Flexible / Not pre-required) */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="space-y-1">
                      <label className="block font-bold text-amber-900">Property Type (Optional)</label>
                      <select 
                        value={assignPropertyType} 
                        onChange={(e) => setAssignPropertyType(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-[10px] font-semibold text-brand-dark focus:outline-none"
                      >
                        <option value="Co-Living">Co-Living</option>
                        <option value="Apartment">Apartment</option>
                        <option value="Penthouse">Penthouse</option>
                        <option value="Suite">Suite</option>
                        <option value="Studio">Studio</option>
                        <option value="Room">Room</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-amber-900">Property Location (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Berlin Mitte Central"
                        value={assignPropertyLocation}
                        onChange={(e) => setAssignPropertyLocation(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-[10px] font-semibold text-brand-dark focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Dates Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="space-y-1">
                      <label className="block font-bold text-amber-900">Check-in Date *</label>
                      <input 
                        type="date" 
                        required
                        value={assignStartDate}
                        onChange={(e) => setAssignStartDate(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-[10px] font-semibold text-brand-dark focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-amber-900">Check-out Date *</label>
                      <input 
                        type="date" 
                        required
                        value={assignEndDate}
                        onChange={(e) => setAssignEndDate(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-[10px] font-semibold text-brand-dark focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Room Number & Target Monthly Rent Indicator */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="space-y-1 col-span-2">
                      <label className="block font-bold text-amber-900">Assign Suite / Room No. *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Suite 312"
                        value={assignRoomNum}
                        onChange={(e) => setAssignRoomNum(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-lg p-1.5 text-[10px] font-semibold text-brand-dark focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-[#F9F8F6] font-bold rounded-lg text-[10px] tracking-wide uppercase transition-all shadow-xs cursor-pointer mt-1"
                  >
                    Assign Unit & Approve Portal
                  </button>
                </form>
              </div>
            )}

            {/* Header: Name & Badges */}
            <div className="border-b border-brand-border pb-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 shrink-0 aspect-square bg-brand-surface border border-brand-border text-brand-primary font-extrabold text-sm rounded-full flex items-center justify-center">
                    {selectedTenant.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-brand-dark font-serif">{selectedTenant.name}</h4>
                    <p className="text-[11px] text-brand-stone font-mono">{selectedTenant.id}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border border-brand-border whitespace-nowrap shrink-0 ${
                    selectedTenant.status === 'Checked-In' 
                      ? 'bg-brand-surface text-brand-primary' 
                      : selectedTenant.status === 'Pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-brand-bg text-brand-secondary'
                  }`}>
                    {selectedTenant.status}
                  </span>
                  {selectedTenant.status !== 'Pending' && (
                    <button
                      type="button"
                      onClick={() => setIsEditingLease(!isEditingLease)}
                      className="text-[10px] font-bold text-brand-primary hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      {isEditingLease ? 'Cancel Edit' : 'Edit Lease'}
                    </button>
                  )}
                </div>
              </div>

              {isEditingLease ? (
                /* Inline Lease Editor */
                <form onSubmit={(e) => {
                  e.preventDefault();
                  
                  const checkinDate = new Date(assignStartDate);
                  const checkoutDate = new Date(assignEndDate);
                  
                  if (checkoutDate.getTime() <= checkinDate.getTime()) {
                    showToast('Check-out date must be after check-in date.', 'error');
                    return;
                  }

                  const diffMs = checkoutDate.getTime() - checkinDate.getTime();
                  const calculatedLength = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4)));
                  const depositMultiplier = calculatedLength < 6 ? 1.5 : 2;
                  const calculatedDeposit = selectedTenant.monthlyRent * depositMultiplier;

                  const updated: Tenant = {
                    ...selectedTenant,
                    roomNumber: assignRoomNum.trim(),
                    building: assignPropertyLocation.trim() || 'Berlin Mitte Central',
                    propertyType: assignPropertyType,
                    propertyLocation: assignPropertyLocation.trim(),
                    contractStartDate: assignStartDate,
                    contractEndDate: assignEndDate,
                    contractLengthMonths: calculatedLength,
                    depositAmount: calculatedDeposit
                  };
                  onUpdateTenant(updated);
                  onAddActivity(
                    'tenant',
                    'Updated Lease Details',
                    `Admin modified lease parameters for ${selectedTenant.name}: ${assignPropertyType} at ${assignPropertyLocation.trim() || 'Berlin Mitte Central'} (Unit: ${assignRoomNum.trim()}), dates: ${assignStartDate} to ${assignEndDate} (${calculatedLength} mo).`
                  );
                  setIsEditingLease(false);
                  showToast(`Lease details updated for ${selectedTenant.name}!`);
                }} className="space-y-3 bg-brand-surface/40 p-3.5 rounded-xl border border-brand-border text-xs">
                  <span className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">Modify Lease Profile</span>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="space-y-1">
                      <label className="block font-semibold text-brand-dark">Property Type</label>
                      <select 
                        value={assignPropertyType} 
                        onChange={(e) => setAssignPropertyType(e.target.value)}
                        className="w-full bg-white border border-brand-border rounded-lg p-1 text-[10px] text-brand-dark focus:outline-none"
                      >
                        <option value="Co-Living">Co-Living</option>
                        <option value="Apartment">Apartment</option>
                        <option value="Penthouse">Penthouse</option>
                        <option value="Suite">Suite</option>
                        <option value="Studio">Studio</option>
                        <option value="Room">Room</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block font-semibold text-brand-dark">Property Location</label>
                      <input 
                        type="text" 
                        value={assignPropertyLocation}
                        onChange={(e) => setAssignPropertyLocation(e.target.value)}
                        className="w-full bg-white border border-brand-border rounded-lg p-1 text-[10px] text-brand-dark focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="space-y-1">
                      <label className="block font-semibold text-brand-dark">Check-In Date</label>
                      <input 
                        type="date" 
                        required
                        value={assignStartDate}
                        onChange={(e) => setAssignStartDate(e.target.value)}
                        className="w-full bg-white border border-brand-border rounded-lg p-1 text-[10px] text-brand-dark focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-semibold text-brand-dark">Check-Out Date</label>
                      <input 
                        type="date" 
                        required
                        value={assignEndDate}
                        onChange={(e) => setAssignEndDate(e.target.value)}
                        className="w-full bg-white border border-brand-border rounded-lg p-1 text-[10px] text-brand-dark focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-brand-dark">Suite / Room No.</label>
                    <input 
                      type="text" 
                      required
                      value={assignRoomNum}
                      onChange={(e) => setAssignRoomNum(e.target.value)}
                      className="w-full bg-white border border-brand-border rounded-lg p-1 text-[10px] text-brand-dark focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingLease(false)}
                      className="flex-1 py-1.5 bg-white border border-brand-border hover:bg-brand-bg text-brand-secondary text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-brand-primary hover:bg-[#4E4E37] text-white text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                /* Primary Contact & Lease Details Display */
                <div className="space-y-2 pt-1">
                  <div className="flex items-center space-x-2 text-xs text-brand-secondary">
                    <Mail className="h-3.5 w-3.5 text-brand-stone" />
                    <span className="font-medium">{selectedTenant.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-brand-secondary">
                    <Phone className="h-3.5 w-3.5 text-brand-stone" />
                    <span className="font-medium font-mono">{selectedTenant.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-brand-secondary">
                    <MapPin className="h-3.5 w-3.5 text-brand-stone" />
                    <span className="font-semibold text-brand-dark">{selectedTenant.roomNumber || 'No unit assigned'}</span>
                    <span className="text-[10px] text-brand-stone font-medium">
                      ({selectedTenant.propertyType || 'Co-Living'} • {selectedTenant.propertyLocation || selectedTenant.building})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-brand-secondary">
                    <Calendar className="h-3.5 w-3.5 text-brand-stone" />
                    <span className="font-semibold text-brand-dark">
                      {selectedTenant.contractStartDate} to {selectedTenant.contractEndDate}
                    </span>
                    <span className="text-[10px] text-brand-stone font-medium">
                      ({selectedTenant.contractLengthMonths} mo)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Document & Contract Vault */}
            <div className="space-y-4 bg-brand-surface/30 p-4 rounded-2xl border border-brand-border">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Document & Contract Vault</h5>
                <span className="text-[9px] font-bold bg-brand-primary text-[#F9F8F6] px-2.5 py-1 rounded-full font-mono whitespace-nowrap shrink-0">
                  {2 + (selectedTenant.additionalDocs?.length || 0)} Documents
                </span>
              </div>

              {/* 1. List of Current Vault Files */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {/* ID Document */}
                <div className="p-3 bg-white border border-brand-border rounded-xl flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {selectedTenant.idDocumentVerified === true ? (
                      <ShieldCheck className="h-4.5 w-4.5 text-brand-primary shrink-0" />
                    ) : selectedTenant.idDocumentVerified === false ? (
                      <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                    ) : (
                      <Clock className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-brand-stone uppercase tracking-wider">Government ID</p>
                      <p className="text-xs font-semibold text-brand-dark truncate">{selectedTenant.idDocumentUrl}</p>
                      {selectedTenant.idDocumentVerified === true ? (
                        <p className="text-[9px] text-brand-primary font-bold flex items-center gap-1">
                          Approved & Verified
                        </p>
                      ) : selectedTenant.idDocumentVerified === false ? (
                        <p className="text-[9px] text-rose-700 font-bold flex items-center gap-1">
                          Rejected / Action Needed
                        </p>
                      ) : (
                        <p className="text-[9px] text-amber-700 font-semibold flex items-center gap-1">
                          Awaiting Verification
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setActivePreviewDoc({
                        fileName: selectedTenant.idDocumentUrl,
                        docType: 'id'
                      });
                      setZoomLevel(100);
                      setRotation(0);
                      setWatermarkEnabled(true);
                      setShowRejectionForm(false);
                      setRejectionReason('');
                    }}
                    className="text-[10px] font-bold text-brand-secondary hover:text-brand-primary bg-brand-surface border border-brand-border px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0"
                  >
                    Inspect
                  </button>
                </div>

                {/* Lease Contract */}
                <div className="p-3 bg-white border border-brand-border rounded-xl flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {selectedTenant.contractVerified === true ? (
                      <ShieldCheck className="h-4.5 w-4.5 text-brand-primary shrink-0" />
                    ) : selectedTenant.contractVerified === false ? (
                      <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                    ) : (
                      <Clock className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-brand-stone uppercase tracking-wider">Lease Contract</p>
                      <p className="text-xs font-semibold text-brand-dark truncate">
                        {selectedTenant.contractFileName || "lease_agreement_draft.pdf"}
                      </p>
                      {selectedTenant.contractFileName ? (
                        selectedTenant.contractVerified === true ? (
                          <p className="text-[9px] text-brand-primary font-bold flex items-center gap-1">
                            Signed & Approved
                          </p>
                        ) : selectedTenant.contractVerified === false ? (
                          <p className="text-[9px] text-rose-700 font-bold flex items-center gap-1">
                            Signature Rejected
                          </p>
                        ) : (
                          <p className="text-[9px] text-amber-700 font-semibold flex items-center gap-1">
                            Awaiting Countersign
                          </p>
                        )
                      ) : (
                        <p className="text-[9px] text-brand-stone font-medium">Unsigned draft generated</p>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setActivePreviewDoc({
                        fileName: selectedTenant.contractFileName || 'lease_agreement.pdf',
                        docType: 'contract'
                      });
                      setZoomLevel(100);
                      setRotation(0);
                      setWatermarkEnabled(true);
                      setShowRejectionForm(false);
                      setRejectionReason('');
                    }}
                    className="text-[10px] font-bold text-brand-secondary hover:text-brand-primary bg-brand-surface border border-brand-border px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0"
                  >
                    Inspect
                  </button>
                </div>

                {/* Additional Documents List */}
                {selectedTenant.additionalDocs && selectedTenant.additionalDocs.length > 0 ? (
                  selectedTenant.additionalDocs.map((doc, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-white border border-brand-border rounded-xl flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow animate-fade-in"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Paperclip className="h-4.5 w-4.5 text-brand-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-brand-stone uppercase tracking-wider">Additional Document</p>
                          <p className="text-xs font-semibold text-brand-dark truncate" title={doc.name}>
                            {doc.name}
                          </p>
                          <p className="text-[9px] text-brand-stone font-medium">
                            Uploaded on {doc.uploadedAt} {doc.size ? `• ${doc.size}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button 
                          type="button"
                          onClick={() => {
                            setActivePreviewDoc({
                              fileName: doc.name,
                              docType: 'id' // View as non-contract/generic preview
                            });
                            setZoomLevel(100);
                            setRotation(0);
                            setWatermarkEnabled(true);
                            setShowRejectionForm(false);
                            setRejectionReason('');
                          }}
                          className="text-[10px] font-bold text-brand-secondary hover:text-brand-primary bg-brand-surface border border-brand-border px-2 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAdditionalDoc(doc.name)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 transition-colors cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : null}
              </div>

              {/* 2. Drag & Drop Upload Zone */}
              <div className="pt-3 border-t border-brand-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">
                    Upload & Associate New Files
                  </label>
                  <span className="text-[9px] font-extrabold text-brand-stone uppercase">
                    Target: <span className="text-brand-primary">{uploadDocType === 'contract' ? 'Lease Contract' : uploadDocType === 'id' ? 'Govt ID' : 'Other Doc'}</span>
                  </span>
                </div>

                {/* Association Selector Pills */}
                <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-brand-border/60">
                  <button
                    type="button"
                    onClick={() => setUploadDocType('contract')}
                    className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                      uploadDocType === 'contract'
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'text-brand-secondary hover:bg-brand-surface'
                    }`}
                  >
                    Contract
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadDocType('id')}
                    className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                      uploadDocType === 'id'
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'text-brand-secondary hover:bg-brand-surface'
                    }`}
                  >
                    Govt ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadDocType('other')}
                    className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                      uploadDocType === 'other'
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'text-brand-secondary hover:bg-brand-surface'
                    }`}
                  >
                    Other Doc
                  </button>
                </div>

                {/* Interactive Drag & Drop Box */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 select-none ${
                    isDragging
                      ? 'border-brand-primary bg-brand-surface/70 scale-[0.99] shadow-inner'
                      : 'border-brand-border hover:border-brand-primary hover:bg-white bg-white/50'
                  }`}
                >
                  {/* Hidden Input for Click Trigger */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        processUploadedFile(file);
                      }
                    }}
                    className="hidden"
                  />

                  <div className="flex flex-col items-center space-y-1.5">
                    <UploadCloud className={`h-8 w-8 transition-transform ${isDragging ? 'text-brand-primary scale-110 animate-pulse' : 'text-brand-stone'}`} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-brand-dark">
                        {isDragging ? "Drop your file here!" : "Drag & drop files here"}
                      </p>
                      <p className="text-[10px] text-brand-stone font-medium">
                        or <span className="text-brand-primary font-bold">browse your computer</span>
                      </p>
                    </div>
                    <p className="text-[9px] text-brand-stone font-medium pt-1">
                      Supports PDF, DOC, DOCX or Images up to 25MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Parameters */}
            <div className="space-y-3 bg-brand-surface/50 p-4 rounded-xl border border-brand-border">
              <h5 className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Lease Configuration & Rates</h5>
              
              <div className="divide-y divide-brand-border text-xs">
                {/* Monthly Rent */}
                <div className="flex justify-between py-2">
                  <span className="text-brand-secondary font-medium">Base Room Rent</span>
                  <span className="font-bold text-brand-dark font-mono">€{selectedTenant.monthlyRent.toFixed(2)}/mo</span>
                </div>

                {/* Extra Person Surcharge */}
                <div className="flex justify-between py-2 items-center">
                  <div className="space-y-0.5">
                    <span className="text-brand-secondary flex items-center gap-1">
                      Extra Person Surcharge 
                      <span className="text-[10px] font-bold text-brand-stone">(€85.00/mo)</span>
                    </span>
                    {selectedTenant.hasExtraPerson && (
                      <p className="text-[10px] text-brand-primary font-medium font-serif italic">Co-occupant active</p>
                    )}
                  </div>
                  <button
                    onClick={handleToggleExtraPerson}
                    className="text-brand-secondary hover:text-brand-primary transition-colors cursor-pointer"
                    title={selectedTenant.hasExtraPerson ? "Disable surcharge" : "Enable surcharge"}
                  >
                    {selectedTenant.hasExtraPerson ? (
                      <ToggleRight className="h-6 w-6 text-brand-primary" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-brand-stone" />
                    )}
                  </button>
                </div>

                {/* Deposit Calculator */}
                <div className="flex justify-between py-2.5">
                  <div className="space-y-0.5">
                    <span className="text-brand-secondary">Security Deposit Status</span>
                    <p className="text-[9px] text-brand-stone font-medium">
                      {getDepositRuleText(selectedTenant.contractLengthMonths)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-brand-dark font-mono">€{selectedTenant.depositAmount.toFixed(2)}</span>
                    <span className={`block text-[9px] font-extrabold ${
                      selectedTenant.depositStatus === 'Paid' ? 'text-brand-primary' : 'text-amber-600'
                    }`}>
                      {selectedTenant.depositStatus}
                    </span>
                  </div>
                </div>

                {/* Move in Admin Fee */}
                <div className="flex justify-between py-2">
                  <div className="space-y-0.5">
                    <span className="text-brand-secondary">One-time Move-in Fee</span>
                    <p className="text-[9px] text-brand-stone font-medium">Standard institutional setup</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-brand-dark font-mono">€{selectedTenant.oneTimeAdminFee.toFixed(2)}</span>
                    <span className="block text-[9px] text-brand-primary font-extrabold font-serif italic">Billed (One-time)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Add-on services */}
            <div className="space-y-2">
              <h5 className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Active Add-on Subscriptions</h5>
              {selectedTenant.activeAddOns.length === 0 ? (
                <p className="text-xs text-brand-stone italic">No add-on subscriptions active.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTenant.activeAddOns.map((addon, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-brand-surface text-brand-primary font-semibold border border-brand-border"
                    >
                      <Sparkles className="h-3 w-3 text-brand-primary mr-1" />
                      {addon}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Property Handover, Inspection Photos & Suite Inventory Registry */}
            <div className="space-y-4 bg-brand-surface/30 p-4 rounded-2xl border border-brand-border">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-2.5">
                <h5 className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Handover & Suite Inventory Manager</h5>
                <span className="text-[9px] font-bold bg-[#EAE8E1] border border-[#DCDAD2] text-brand-primary px-2.5 py-1 rounded-full font-mono whitespace-nowrap shrink-0">
                  {(selectedTenant.inventoryItems || []).reduce((sum, item) => sum + item.quantity, 0)} Items Registered
                </span>
              </div>

              {/* 1. Check-In & Check-Out Image Uploaders */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                {/* Check-In Photo Manager */}
                <div className="space-y-2">
                  <span className="block font-bold text-[10px] uppercase tracking-wider text-brand-stone">Check-In Photos</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(selectedTenant.checkInImages || []).map((img, idx) => (
                      <div key={`ci-${idx}`} className="relative group h-12 rounded-lg border border-brand-border overflow-hidden bg-white shadow-2xs">
                        <img src={img} alt={`CI-${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = {
                              ...selectedTenant,
                              checkInImages: (selectedTenant.checkInImages || []).filter((_, i) => i !== idx)
                            };
                            onUpdateTenant(updated);
                            onAddActivity('tenant', 'Deleted Handover Photo', `Admin removed check-in image for ${selectedTenant.name}`);
                          }}
                          className="absolute inset-0 bg-rose-600/80 hover:bg-rose-700/90 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete check-in photo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    
                    <label className="border border-dashed border-brand-stone/60 hover:border-brand-primary bg-white hover:bg-brand-surface/40 h-12 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors shadow-2xs">
                      <Plus className="h-4 w-4 text-brand-primary" />
                      <span className="text-[8px] font-bold text-brand-stone uppercase tracking-wide">Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                const updated = {
                                  ...selectedTenant,
                                  checkInImages: [...(selectedTenant.checkInImages || []), reader.result]
                                };
                                onUpdateTenant(updated);
                                onAddActivity('tenant', 'Uploaded Handover Photo', `Admin uploaded new check-in image for ${selectedTenant.name}`);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Check-Out Photo Manager */}
                <div className="space-y-2">
                  <span className="block font-bold text-[10px] uppercase tracking-wider text-brand-stone">Check-Out Photos</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(selectedTenant.checkOutImages || []).map((img, idx) => (
                      <div key={`co-${idx}`} className="relative group h-12 rounded-lg border border-brand-border overflow-hidden bg-white shadow-2xs">
                        <img src={img} alt={`CO-${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = {
                              ...selectedTenant,
                              checkOutImages: (selectedTenant.checkOutImages || []).filter((_, i) => i !== idx)
                            };
                            onUpdateTenant(updated);
                            onAddActivity('tenant', 'Deleted Handover Photo', `Admin removed check-out image for ${selectedTenant.name}`);
                          }}
                          className="absolute inset-0 bg-rose-600/80 hover:bg-rose-700/90 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete check-out photo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    
                    <label className="border border-dashed border-brand-stone/60 hover:border-brand-primary bg-white hover:bg-brand-surface/40 h-12 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors shadow-2xs">
                      <Plus className="h-4 w-4 text-brand-primary" />
                      <span className="text-[8px] font-bold text-brand-stone uppercase tracking-wide">Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                const updated = {
                                  ...selectedTenant,
                                  checkOutImages: [...(selectedTenant.checkOutImages || []), reader.result]
                                };
                                onUpdateTenant(updated);
                                onAddActivity('tenant', 'Uploaded Handover Photo', `Admin uploaded new check-out image for ${selectedTenant.name}`);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* 2. Suite Inventory Management */}
              <div className="space-y-2 pt-2 border-t border-brand-border/60">
                <span className="block font-bold text-[10px] uppercase tracking-wider text-brand-stone">Suite Inventory List</span>
                
                {/* List items */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {!(selectedTenant.inventoryItems && selectedTenant.inventoryItems.length > 0) ? (
                    <p className="text-[11px] text-brand-stone italic py-1">No inventory items associated with this suite.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedTenant.inventoryItems.map((item, idx) => (
                        <div key={`inv-edit-${idx}`} className="p-2 bg-white border border-brand-border rounded-xl flex items-center justify-between text-xs gap-2 shadow-2xs">
                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const updatedItems = [...(selectedTenant.inventoryItems || [])];
                                updatedItems[idx] = { ...item, name: e.target.value };
                                onUpdateTenant({
                                  ...selectedTenant,
                                  inventoryItems: updatedItems
                                });
                              }}
                              className="w-full bg-transparent font-semibold text-brand-dark focus:outline-none focus:bg-brand-surface/40 px-1 py-0.5 rounded-md"
                            />
                          </div>
                          
                          {/* Qty incrementer/decrementer */}
                          <div className="flex items-center space-x-1 shrink-0 bg-brand-surface border border-brand-border rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity > 1) {
                                  const updatedItems = [...(selectedTenant.inventoryItems || [])];
                                  updatedItems[idx] = { ...item, quantity: item.quantity - 1 };
                                  onUpdateTenant({
                                    ...selectedTenant,
                                    inventoryItems: updatedItems
                                  });
                                }
                              }}
                              className="p-1 hover:bg-white rounded-md text-brand-secondary cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono text-xs font-bold text-brand-dark px-1">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedItems = [...(selectedTenant.inventoryItems || [])];
                                updatedItems[idx] = { ...item, quantity: item.quantity + 1 };
                                onUpdateTenant({
                                  ...selectedTenant,
                                  inventoryItems: updatedItems
                                });
                              }}
                              className="p-1 hover:bg-white rounded-md text-brand-secondary cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Condition Selector */}
                          <select
                            value={item.condition}
                            onChange={(e) => {
                              const updatedItems = [...(selectedTenant.inventoryItems || [])];
                              updatedItems[idx] = { ...item, condition: e.target.value as any };
                              onUpdateTenant({
                                ...selectedTenant,
                                inventoryItems: updatedItems
                              });
                            }}
                            className="bg-brand-surface border border-brand-border rounded-lg py-1 px-1 text-[10px] text-brand-secondary font-bold focus:outline-none cursor-pointer shrink-0"
                          >
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Needs Replacement">Replace</option>
                          </select>

                          {/* Trash */}
                          <button
                            type="button"
                            onClick={() => {
                              const updatedItems = (selectedTenant.inventoryItems || []).filter((_, i) => i !== idx);
                              onUpdateTenant({
                                ...selectedTenant,
                                inventoryItems: updatedItems
                              });
                              onAddActivity('tenant', 'Deleted Inventory Item', `Admin deleted inventory item ${item.name} for ${selectedTenant.name}`);
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-lg cursor-pointer shrink-0"
                            title="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline Add Form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newInvName.trim()) return;
                    const updatedItems = [
                      ...(selectedTenant.inventoryItems || []),
                      {
                        name: newInvName.trim(),
                        quantity: newInvQty,
                        condition: newInvCondition
                      }
                    ];
                    onUpdateTenant({
                      ...selectedTenant,
                      inventoryItems: updatedItems
                    });
                    onAddActivity('tenant', 'Inventory Item Registered', `Admin added ${newInvQty}x ${newInvName.trim()} (${newInvCondition}) to suite inventory for ${selectedTenant.name}`);
                    setNewInvName('');
                    setNewInvQty(1);
                    setNewInvCondition('Good');
                  }}
                  className="grid grid-cols-12 gap-1 bg-white p-1.5 border border-brand-border/60 rounded-xl text-[10px]"
                >
                  <div className="col-span-6">
                    <input
                      type="text"
                      required
                      placeholder="New item name..."
                      value={newInvName}
                      onChange={(e) => setNewInvName(e.target.value)}
                      className="w-full bg-brand-surface/40 hover:bg-brand-surface/60 border border-brand-border/60 rounded-lg p-1.5 text-[11px] text-brand-dark focus:bg-white focus:outline-none"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      required
                      value={newInvQty}
                      onChange={(e) => setNewInvQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-brand-surface/40 border border-brand-border/60 rounded-lg p-1.5 text-[11px] font-mono text-center text-brand-dark focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="col-span-3">
                    <select
                      value={newInvCondition}
                      onChange={(e) => setNewInvCondition(e.target.value as any)}
                      className="w-full bg-brand-surface/40 border border-brand-border/60 rounded-lg p-1.5 text-[10.5px] text-brand-secondary focus:bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Needs Replacement">Replace</option>
                    </select>
                  </div>

                  <div className="col-span-1">
                    <button
                      type="submit"
                      className="w-full h-full bg-brand-primary hover:bg-[#4E4E37] text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                      title="Add item"
                    >
                      <Plus className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-brand-border">
              <button
                onClick={() => setShowExtensionModal(true)}
                className="py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white rounded-xl text-xs font-bold transition-colors text-center cursor-pointer"
              >
                Contract Extension
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                className="py-2.5 bg-white hover:bg-rose-50 border border-brand-border text-rose-600 hover:border-rose-200 rounded-xl text-xs font-bold transition-colors text-center cursor-pointer"
              >
                Initiate Cancel
              </button>
            </div>

          </div>
        ) : (
          <div className="bg-brand-surface border-2 border-dashed border-brand-border rounded-2xl p-12 text-center text-brand-stone text-xs font-medium">
            Select a tenant from the directory to review credentials and configure rate options.
          </div>
        )}
      </div>

      {/* Contract Extension Modal Dialog */}
      {showExtensionModal && selectedTenant && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Extend Co-Living Agreement</h3>
                <p className="text-xs text-slate-400">Resident: {selectedTenant.name}</p>
              </div>
              <button 
                onClick={() => setShowExtensionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Lease Length</span>
                  <strong className="text-slate-700">{selectedTenant.contractLengthMonths} Months</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expirations Schedule</span>
                  <strong className="text-slate-700">{selectedTenant.contractEndDate}</strong>
                </div>
              </div>

              {/* Slider / Extension Period */}
              <div className="space-y-2">
                <label className="block font-bold text-brand-dark">Select Extension Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExtensionMonths(m)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                        extensionMonths === m
                          ? 'bg-brand-primary border-brand-primary text-white'
                          : 'bg-white border-brand-border text-brand-secondary hover:bg-brand-bg'
                      }`}
                    >
                      +{m} Mon
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto calculated deposit preview */}
              <div className="p-3 bg-brand-surface text-brand-dark rounded-xl border border-brand-border space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-brand-primary font-serif italic">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Dynamic Security Deposit Recalculation</span>
                </div>
                <p className="leading-relaxed text-[11px] text-brand-secondary">
                  Stays under 6 months default to a 1.5x rent deposit, while stays 6 months or longer update to 2x rent deposit.
                </p>
                <div className="pt-1.5 border-t border-brand-border flex justify-between font-semibold text-xs">
                  <span>New Total Lease length</span>
                  <span>{selectedTenant.contractLengthMonths + extensionMonths} Months</span>
                </div>
                <div className="flex justify-between font-extrabold text-brand-primary text-[13px] font-mono">
                  <span>New Deposit Requirement</span>
                  <span>
                    €{((selectedTenant.contractLengthMonths + extensionMonths) < 6 
                      ? selectedTenant.monthlyRent * 1.5 
                      : selectedTenant.monthlyRent * 2).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowExtensionModal(false)}
                className="flex-1 py-2.5 bg-brand-surface hover:bg-brand-bg border border-brand-border text-brand-secondary rounded-xl text-xs font-bold transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleExtendContract}
                className="flex-1 py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white rounded-xl text-xs font-bold transition-colors"
              >
                Commit Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal Dialog */}
      {showCancelModal && selectedTenant && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-brand-border max-w-sm w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2 text-rose-700">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <h3 className="font-bold text-brand-dark text-base font-serif">Terminate Lease Agreement</h3>
              </div>
              <button 
                onClick={() => setShowCancelModal(false)}
                className="text-brand-stone hover:text-brand-dark"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-brand-secondary leading-relaxed">
              Are you sure you want to trigger immediate cancellation check-out protocols for <strong className="text-brand-dark">{selectedTenant.name}</strong>? 
              This will set their status to <strong className="text-brand-dark">"Checked-Out"</strong> effective today and trigger deposit refund status review.
            </p>

            <div className="bg-brand-surface text-brand-dark border border-brand-border p-3 rounded-xl text-[11px] leading-relaxed">
              <strong>Check-out Notice:</strong> Ensure the room has been inspected for damages and that active add-on keys or tags have been physically returned before processing the refund status.
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-brand-surface hover:bg-brand-bg border border-brand-border text-brand-secondary rounded-xl text-xs font-bold transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleProcessCancellation}
                className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Confirm Check-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Vault Modal Dialog */}
      {activePreviewDoc && selectedTenant && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 md:p-6 z-50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-brand-border max-w-6xl w-full h-[90vh] md:h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl animate-scale-up">
            
            {/* Left: Document Viewport Area */}
            <div className="flex-1 bg-slate-900 flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-brand-border">
              {/* Document Toolbar */}
              <div className="bg-slate-800 px-4 py-3 flex items-center justify-between gap-4 border-b border-slate-700 shrink-0">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="p-1.5 bg-brand-surface text-brand-primary border border-brand-border rounded-lg shrink-0">
                    {activePreviewDoc.docType === 'id' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate font-mono">{activePreviewDoc.fileName}</h4>
                    <p className="text-[9px] text-slate-400 font-medium">Document Vault Secure Previewer (No-Download Verification)</p>
                  </div>
                </div>

                {/* Toolbar controls */}
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(50, prev - 25))}
                    title="Zoom Out"
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-300 font-mono w-10 text-center select-none">
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(200, prev + 25))}
                    title="Zoom In"
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  
                  <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block"></div>

                  <button
                    type="button"
                    onClick={() => setRotation(prev => (prev + 90) % 360)}
                    title="Rotate 90°"
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                    title="Toggle Watermark"
                    className={`p-1.5 border rounded-lg transition-colors cursor-pointer hidden sm:block ${
                      watermarkEnabled 
                        ? 'bg-brand-primary border-brand-primary text-white' 
                        : 'bg-slate-700 border-slate-600 text-slate-400'
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                  </button>

                  <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block"></div>

                  <button
                    type="button"
                    onClick={() => showToast(`Secure watermarked print job dispatched for audit logging by ${selectedTenant.name}`, 'info')}
                    title="Print Document"
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => showToast('Secure watermarked duplicate exported to local directory.', 'info')}
                    title="Download Document"
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Document Canvas Viewer Grid */}
              <div className="flex-1 bg-slate-950 p-6 overflow-auto flex items-center justify-center relative">
                {/* Simulated Watermark Overlay */}
                {watermarkEnabled && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 opacity-10 select-none overflow-hidden">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="text-white text-xs md:text-sm font-black uppercase tracking-widest font-mono whitespace-nowrap -rotate-12 translate-x-12"
                      >
                        SEVEN ROCKS AUDIT SECURE PREVIEW • NO DIRECT DISTRIBUTION ALLOWED • SYSTEM COMPLIANCE VERIFICATION • 
                      </div>
                    ))}
                  </div>
                )}

                {/* PDF Page Container */}
                <div 
                  style={{ 
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  className={`bg-white rounded-xl shadow-2xl border border-slate-800 relative shrink-0 overflow-hidden select-none select-none-all ${
                    activePreviewDoc.docType === 'id' 
                      ? 'w-[520px] h-[330px]' 
                      : 'w-[560px] h-[780px] p-8 md:p-12'
                  }`}
                >
                  {/* Watermark security line inside file */}
                  {watermarkEnabled && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-brand-primary/10 m-2 flex items-center justify-center">
                      <div className="text-[11px] font-extrabold text-brand-primary/5 uppercase font-serif tracking-widest -rotate-45 text-center leading-loose">
                        PROPERTY OF SEVEN ROCKS RESIDENCE GMBH<br />
                        COMPLIANCE AUDIT PREVIEW BY ADMIN<br />
                        NOT FOR OFFICIAL LEASE RECORD OUTSIDE PORTAL
                      </div>
                    </div>
                  )}

                  {/* ID Document Preview Template */}
                  {activePreviewDoc.docType === 'id' ? (
                    <div className="h-full w-full bg-linear-to-br from-slate-50 to-slate-100/70 p-6 flex flex-col justify-between relative text-slate-800">
                      {/* Passport / ID Card Header */}
                      <div className="flex justify-between items-start border-b border-slate-300 pb-2">
                        <div>
                          <h5 className="text-[10px] font-black tracking-widest text-slate-900 uppercase font-mono">
                            {selectedTenant.phone.startsWith('+49') ? 'BUNDESREPUBLIK DEUTSCHLAND' : selectedTenant.phone.startsWith('+46') ? 'SVERIGE KONUNGARIKET' : 'EUROPEAN UNION RESIDENT'}
                          </h5>
                          <h6 className="text-[9px] font-extrabold text-brand-primary font-serif italic tracking-wide">
                            {selectedTenant.idDocumentUrl.toLowerCase().includes('passport') ? 'REISEPASS / PASSPORT / COMPLIANCE DEED' : 'PERSONALAUSWEIS / IDENTITY CARD'}
                          </h6>
                        </div>
                        <div className="flex space-x-1 items-center">
                          <div className="w-4 h-3 bg-blue-800 rounded-xs flex items-center justify-center p-0.5">
                            <span className="text-[5px] text-yellow-300 font-extrabold font-mono">★</span>
                          </div>
                          <span className="text-[9px] font-black text-slate-600 font-mono">ID</span>
                        </div>
                      </div>

                      {/* Card Middle Grid: Avatar & Details */}
                      <div className="grid grid-cols-12 gap-4 flex-1 items-center pt-3">
                        {/* Portrait Frame */}
                        <div className="col-span-4 flex flex-col items-center justify-center">
                          <div className="h-24 w-20 bg-slate-300 border border-slate-400 rounded-lg flex items-center justify-center overflow-hidden relative shadow-xs">
                            {/* Dummy photo graphic */}
                            <div className="absolute inset-0 bg-linear-to-t from-slate-800/40 via-transparent to-transparent z-10"></div>
                            <User className="h-16 w-16 text-slate-500 mt-2" />
                            {/* Laser secure sign */}
                            <div className="absolute bottom-1 right-1 w-5 h-5 bg-yellow-400/20 rounded-full border border-yellow-500/40 backdrop-blur-xs flex items-center justify-center">
                              <span className="text-[5px] text-yellow-800 font-black">★</span>
                            </div>
                          </div>
                          <span className="text-[7px] text-slate-400 font-bold mt-1 tracking-widest uppercase font-mono">HOLOGRAPHIC</span>
                        </div>

                        {/* ID Particulars */}
                        <div className="col-span-8 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[8px] font-mono leading-none">
                          <div>
                            <span className="text-[6px] text-slate-400 block uppercase">Name / Nom</span>
                            <span className="font-bold text-slate-900 text-[10px]">{selectedTenant.name.split(' ')[1]?.toUpperCase() || 'JENKINS'}</span>
                          </div>
                          <div>
                            <span className="text-[6px] text-slate-400 block uppercase">Given Names / Prénoms</span>
                            <span className="font-bold text-slate-900 text-[10px]">{selectedTenant.name.split(' ')[0] || 'Sarah'}</span>
                          </div>
                          <div>
                            <span className="text-[6px] text-slate-400 block uppercase">Nationality / Nationalité</span>
                            <span className="font-bold text-slate-800">{selectedTenant.phone.startsWith('+49') ? 'DEUTSCH / D' : selectedTenant.phone.startsWith('+46') ? 'SVENSK / S' : 'EUROPEAN'}</span>
                          </div>
                          <div>
                            <span className="text-[6px] text-slate-400 block uppercase">Document No. / No du Doc</span>
                            <span className="font-extrabold text-brand-stone tracking-wider">DE{selectedTenant.id.replace('TEN-', 'ID')}</span>
                          </div>
                          <div>
                            <span className="text-[6px] text-slate-400 block uppercase">Date of Birth / Date de Naiss</span>
                            <span className="font-bold text-slate-800">14.05.1994</span>
                          </div>
                          <div>
                            <span className="text-[6px] text-slate-400 block uppercase">Expiry Date / Date d'exp</span>
                            <span className="font-bold text-emerald-700">12.12.2031</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[6px] text-slate-400 block uppercase">Authority / Autorité</span>
                            <span className="font-bold text-slate-800">STADTBERLIN / VERIFICATION DEED</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Machine Readable Zone */}
                      <div className="border-t border-slate-300 pt-1.5 flex justify-between items-end">
                        <div className="font-mono text-[7px] text-slate-500 leading-tight tracking-widest font-black uppercase">
                          IDD&lt;&lt;{selectedTenant.name.replace(' ', '&lt;').toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />
                          {selectedTenant.id.replace('TEN-', '9405149D26')}&lt;DEU&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;5
                        </div>
                        <div className="shrink-0 flex items-center space-x-1">
                          <span className="text-[6px] font-black text-slate-400 font-mono">SEVEN ROCKS SECURE</span>
                          <ShieldCheck className="h-3 w-3 text-brand-primary" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Contract Document Preview Template */
                    <div className="h-full w-full bg-white flex flex-col justify-between text-slate-800 font-serif leading-relaxed text-xs">
                      {/* Legal Contract Header */}
                      <div className="text-center space-y-2 border-b border-slate-200 pb-4">
                        <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 font-serif">
                          CO-LIVING RESIDENTIAL AGREEMENT
                        </h4>
                        <p className="text-[9px] uppercase tracking-widest text-slate-500 font-sans font-bold">
                          SEVEN ROCKS CO-LIVING OPERATING GMBH & CO. KG
                        </p>
                      </div>

                      {/* Content Scroll Area inside preview */}
                      <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-4 text-[9.5px] text-slate-700 leading-relaxed max-h-[500px]">
                        <div>
                          <p className="font-bold text-slate-800 uppercase font-sans text-[10px]">SECTION 1: CONTRACTING PARTIES</p>
                          <p className="mt-1">
                            This rental agreement is formed by and between <strong>Seven Rocks Operations</strong> ("Landlord") and the registered co-living occupant:
                          </p>
                          <p className="mt-1 pl-4 font-sans text-[9px] border-l border-brand-primary text-slate-800">
                            <strong>Resident Name:</strong> {selectedTenant.name}<br />
                            <strong>Email Address:</strong> {selectedTenant.email}<br />
                            <strong>Contact Phone:</strong> {selectedTenant.phone}
                          </p>
                        </div>

                        <div>
                          <p className="font-bold text-slate-800 uppercase font-sans text-[10px]">SECTION 2: ALLOCATED PREMISES</p>
                          <p className="mt-1">
                            Landlord hereby leases to Resident, and Resident hereby leases the private residential unit and common-room allocations specified below:
                          </p>
                          <p className="mt-1 pl-4 font-sans text-[9px] border-l border-brand-primary text-slate-800">
                            <strong>Unit Identifier:</strong> {selectedTenant.roomNumber}<br />
                            <strong>Co-living Building Complex:</strong> {selectedTenant.building}<br />
                            <strong>Lease Commencing:</strong> {selectedTenant.contractStartDate}<br />
                            <strong>Lease Terminus:</strong> {selectedTenant.contractEndDate} ({selectedTenant.contractLengthMonths} Months duration)
                          </p>
                        </div>

                        <div>
                          <p className="font-bold text-slate-800 uppercase font-sans text-[10px]">SECTION 3: FINANCIAL AGREEMENT</p>
                          <p className="mt-1">
                            The resident agrees to pay base rental rate, additional co-living utility pack subscriptions, and secure institutional deposit as outlined:
                          </p>
                          <table className="mt-1 w-full text-left font-sans text-[9px] border border-slate-200 rounded-lg">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-1 px-2 font-bold text-slate-600">Cost Category</th>
                                <th className="p-1 px-2 font-bold text-slate-600 text-right">Rate Type</th>
                                <th className="p-1 px-2 font-bold text-slate-600 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-slate-100">
                                <td className="p-1 px-2">Base Room Rental</td>
                                <td className="p-1 px-2 text-right">Monthly Recurring</td>
                                <td className="p-1 px-2 text-right font-mono">€{selectedTenant.monthlyRent.toFixed(2)}</td>
                              </tr>
                              {selectedTenant.hasExtraPerson && (
                                <tr className="border-b border-slate-100">
                                  <td className="p-1 px-2">Extra Person Surcharge</td>
                                  <td className="p-1 px-2 text-right">Monthly Recurring</td>
                                  <td className="p-1 px-2 text-right font-mono">€85.00</td>
                                </tr>
                              )}
                              <tr className="border-b border-slate-100">
                                <td className="p-1 px-2">Security Deposit (Retainable)</td>
                                <td className="p-1 px-2 text-right">One-time Deposit</td>
                                <td className="p-1 px-2 text-right font-mono">€{selectedTenant.depositAmount.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td className="p-1 px-2">Administrative Setup Fee</td>
                                <td className="p-1 px-2 text-right">Non-refundable</td>
                                <td className="p-1 px-2 text-right font-mono">€{selectedTenant.oneTimeAdminFee.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div>
                          <p className="font-bold text-slate-800 uppercase font-sans text-[10px]">SECTION 4: COMPLIANCE &amp; COMMUNITY RULES</p>
                          <p className="mt-1">
                            The resident acknowledges full subjection to municipal fire codes, structural regulations, and the quiet-hours policy (Ruhigezeiten) between 22:00 and 07:00. Substance abuse, room subleases, and unlogged commercial operations inside common spaces are strictly prohibited and constitute immediate lease cancellation grounds.
                          </p>
                        </div>
                      </div>

                      {/* Legal Signatures block */}
                      <div className="border-t border-slate-200 pt-3 flex justify-between text-[9px] items-center">
                        <div className="space-y-1">
                          <p className="font-sans font-bold uppercase text-[7px] text-slate-400">LANDLORD SIGNATURE</p>
                          <div className="h-8 flex items-end">
                            <span className="font-serif italic font-extrabold text-blue-900 border-b border-slate-300 pb-0.5 tracking-wide text-xs">
                              Seven Rocks Ops Team
                            </span>
                          </div>
                          <p className="text-[7px] font-mono text-slate-500">DIGITALLY COUNTERSIGNED SECURELY</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="font-sans font-bold uppercase text-[7px] text-slate-400">RESIDENT CO-OCCUPANT</p>
                          <div className="h-8 flex items-end justify-end">
                            <span className="font-serif italic text-emerald-800 border-b border-slate-300 pb-0.5 text-xs">
                              {selectedTenant.name}
                            </span>
                          </div>
                          <p className="text-[7px] font-mono text-slate-500">SIGNED ON STARTUP: {selectedTenant.contractStartDate}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Administrative Verification Sidebar */}
            <div className="w-full md:w-80 bg-[#FAF9F6] p-6 flex flex-col justify-between shrink-0 overflow-y-auto">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-extrabold uppercase font-mono tracking-wider">
                      Document Audit
                    </span>
                    <h3 className="font-bold text-brand-dark text-base font-serif mt-1">Verification Suite</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setActivePreviewDoc(null)}
                    className="p-1.5 bg-white border border-brand-border hover:bg-brand-bg rounded-lg text-brand-stone hover:text-brand-dark transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Resident Details card */}
                <div className="bg-white border border-brand-border p-3.5 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-brand-stone font-bold uppercase text-[9px] tracking-wider">Associated Resident</span>
                    <span className="text-[9px] bg-brand-surface text-brand-primary px-1.5 py-0.5 rounded font-extrabold font-mono">
                      {selectedTenant.id}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <div className="h-8 w-8 shrink-0 aspect-square bg-brand-surface border border-brand-border rounded-full flex items-center justify-center font-bold text-xs text-brand-primary">
                      {selectedTenant.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-brand-dark truncate">{selectedTenant.name}</p>
                      <p className="text-[10px] text-brand-stone font-semibold">{selectedTenant.roomNumber} ({selectedTenant.building})</p>
                    </div>
                  </div>
                </div>

                {/* Document Metadata Details */}
                <div className="space-y-3">
                  <h5 className="text-[9px] uppercase font-extrabold text-brand-stone tracking-wider">Document Metadata</h5>
                  <div className="space-y-2 text-[11px] font-semibold divide-y divide-brand-border/60">
                    <div className="flex justify-between py-1">
                      <span className="text-brand-stone">File Type</span>
                      <span className="text-brand-dark font-mono font-bold">PDF (Portable Document)</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-brand-stone">File Size</span>
                      <span className="text-brand-dark font-mono font-bold">1.4 MB</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-brand-stone">Encryption Hash</span>
                      <span className="text-brand-stone font-mono text-[9px] truncate max-w-[120px]" title="SHA-256 secure hash checksum">
                        8f3a12cd99b04fc4...
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 items-center">
                      <span className="text-brand-stone">Audit Status</span>
                      {activePreviewDoc.docType === 'id' ? (
                        selectedTenant.idDocumentVerified === true ? (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 font-extrabold whitespace-nowrap shrink-0">Verified ✅</span>
                        ) : selectedTenant.idDocumentVerified === false ? (
                          <span className="text-[9px] bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200 font-extrabold whitespace-nowrap shrink-0">Flagged ❌</span>
                        ) : (
                          <span className="text-[9px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200 font-extrabold whitespace-nowrap shrink-0">Awaiting Verification</span>
                        )
                      ) : (
                        selectedTenant.contractVerified === true ? (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 font-extrabold whitespace-nowrap shrink-0">Approved ✅</span>
                        ) : selectedTenant.contractVerified === false ? (
                          <span className="text-[9px] bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200 font-extrabold whitespace-nowrap shrink-0">Flagged ❌</span>
                        ) : (
                          <span className="text-[9px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200 font-extrabold whitespace-nowrap shrink-0">Awaiting Review</span>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit Actions Forms */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-[9px] uppercase font-extrabold text-brand-stone tracking-wider">Verification Controls</h5>
                  
                  {!showRejectionForm ? (
                    <div className="flex flex-col space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedTenant) return;
                          const isIdVerified = activePreviewDoc.docType === 'id' ? true : !!selectedTenant.idDocumentVerified;
                          const isContractVerified = activePreviewDoc.docType === 'contract' ? true : !!selectedTenant.contractVerified;
                          const willBeFullyVerified = isIdVerified && isContractVerified;

                          const updated: Tenant = {
                            ...selectedTenant,
                            [activePreviewDoc.docType === 'id' ? 'idDocumentVerified' : 'contractVerified']: true,
                            status: willBeFullyVerified && selectedTenant.status === 'Pending' ? 'Checked-In' : selectedTenant.status
                          };
                          onUpdateTenant(updated);
                          onAddActivity(
                            'tenant',
                            'Document Verified',
                            `Admin approved and verified ${activePreviewDoc.docType === 'id' ? 'Compliance ID Document' : 'Lease Contract'} (${activePreviewDoc.fileName}) for resident ${selectedTenant.name}.${willBeFullyVerified ? ' All onboarding documents verified: Resident status shifted to Checked-In.' : ''}`
                          );
                          setActivePreviewDoc(null);
                          if (willBeFullyVerified) {
                            showToast(`All onboarding compliance documents verified! Resident ${selectedTenant.name} has been updated to Checked-In.`);
                          } else {
                            showToast(`Document has been marked as Approved & Verified!`);
                          }
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        <span>Approve & Verify Document</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowRejectionForm(true);
                          setRejectionReason('');
                        }}
                        className="w-full py-2.5 bg-white hover:bg-rose-50 border border-brand-border text-rose-600 hover:border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span>Reject / Flag Document</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-rose-50/50 border border-rose-200 p-3 rounded-xl space-y-3 animate-fade-in text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-rose-800 font-bold uppercase text-[9px]">Rejection Feedbacks</span>
                        <button
                          type="button"
                          onClick={() => setShowRejectionForm(false)}
                          className="text-rose-500 hover:text-rose-700 text-[10px] font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-brand-stone text-[10px] font-bold uppercase">Reason for Flagging *</label>
                        <textarea
                          rows={3}
                          required
                          placeholder="e.g. Document copy is blurry and illegible, passport photo has reflections, or ID has expired."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full bg-white border border-rose-200 rounded-lg p-2.5 text-xs text-brand-dark focus:ring-1 focus:ring-rose-500 focus:outline-none placeholder-brand-stone/40"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!rejectionReason.trim()) {
                            showToast("Please describe why this document is being rejected.", 'error');
                            return;
                          }
                          const updated: Tenant = {
                            ...selectedTenant,
                            [activePreviewDoc.docType === 'id' ? 'idDocumentVerified' : 'contractVerified']: false
                          };
                          onUpdateTenant(updated);
                          onAddActivity(
                            'tenant',
                            'Document Flagged',
                            `Admin rejected ${activePreviewDoc.docType === 'id' ? 'Compliance ID' : 'Lease Contract'} (${activePreviewDoc.fileName}) for resident ${selectedTenant.name}. Reason: "${rejectionReason}"`
                          );
                          setActivePreviewDoc(null);
                          showToast(`Document Rejected: Resident flagged with reason: "${rejectionReason}".`, 'warning');
                        }}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Confirm Flag / Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Secure Audit Notice */}
              <div className="pt-4 border-t border-brand-border/60 text-[9px] text-brand-stone leading-relaxed">
                <p className="flex items-center gap-1 font-bold text-brand-secondary">
                  <ShieldCheck className="h-3 w-3 text-brand-primary" />
                  <span>Audit Compliant & SSL Secure</span>
                </p>
                <p className="mt-0.5">
                  Previews of compliance documents are watermarked on-the-fly and rendered sandbox-side without resident data leak risk.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
