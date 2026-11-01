"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  User, 
  Calendar, 
  Plus, 
  Trash2, 
  Eye, 
  Printer, 
  Receipt, 
  FileSpreadsheet,
  Calculator,
  Lock,
  Sparkles
} from 'lucide-react';
import { Tenant, Invoice } from '../types';
import { SevenRocksLogo } from './SevenRocksLogo';

interface DocumentGeneratorViewProps {
  tenants: Tenant[];
  invoices: Invoice[];
  onCreateInvoice?: (invoice: any) => Promise<any>;
  onAddActivity?: (type: 'tenant' | 'billing' | 'ticket' | 'notification' | 'addon', action: string, details: string) => void;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  amount: string;
  vatPercent: string;
  vatAmount: string;
  extraTaxes: string;
  total: string;
}

export interface InvoiceMetadata {
  invoiceNumber: string;
  invDate: string;
  dueDate: string;
  stayPeriod: string;
  guestCount: string;
  tenantName: string;
  accommodation: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantUid: string;
}

// Approved Official Company & Banking Credentials
export const OFFICIAL_COMPANY_DETAILS = {
  name: 'SEVEN ROCKS GmbH',
  addressLine1: 'Laaer Berg Straße 47A 1100',
  addressCity: 'wien',
  fullAddress: 'Laaer Berg Straße 47A 1100 wien AT',
  email: 'sales@sevenrocksvienna.com',
  infoEmail: 'info@sevenrocksvienna.com',
  phone: '+31650258304',
  uidNr: 'ATU83575105',
  bank: 'ERSTE BANK DER OESTERREICHISCHEN SPARKASSEN AG',
  accountName: 'Seven Rocks GmbH',
  iban: 'AT552011185792653900',
  bic: 'GIBAATWWXXX',
  tagline: 'Thank you for choosing Seven Rocks Vienna!'
};

export default function DocumentGeneratorView({
  tenants,
  invoices,
  onCreateInvoice,
  onAddActivity
}: DocumentGeneratorViewProps) {
  const [docType, setDocType] = useState<'invoice' | 'extension'>('invoice');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || '');

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const defaultIssueDate = useMemo(() => formatDate(new Date()), []);
  const defaultDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return formatDate(d);
  }, []);

  const selectedTenant = useMemo(() => {
    return tenants.find(t => t.id === selectedTenantId) || tenants[0] || null;
  }, [tenants, selectedTenantId]);

  // Invoice Metadata State
  const [metadata, setMetadata] = useState<InvoiceMetadata>(() => {
    const initTenant = tenants[0];
    return {
      invoiceNumber: 'SR202610002',
      invDate: defaultIssueDate,
      dueDate: defaultDueDate,
      stayPeriod: initTenant?.contractStartDate && initTenant?.contractEndDate 
        ? `${initTenant.contractStartDate} - ${initTenant.contractEndDate}`
        : '01.10.2026 - 31.10.2026',
      guestCount: initTenant?.hasExtraPerson ? '2' : '1',
      tenantName: initTenant ? initTenant.name : 'Max Mustermann',
      accommodation: initTenant 
        ? `Unit ${initTenant.roomNumber}, ${initTenant.building}` 
        : 'Laaer Berg Straße 47A, 1100 Wien',
      tenantEmail: initTenant ? initTenant.email : 'guest@example.com',
      tenantPhone: initTenant ? initTenant.phone : '+43 1 2345678',
      tenantUid: 'ATU83198969'
    };
  });

  // Keep metadata in sync when tenant changes if fields weren't customized
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setMetadata(prev => ({
        ...prev,
        tenantName: tenant.name,
        tenantEmail: tenant.email,
        tenantPhone: tenant.phone,
        accommodation: `Unit ${tenant.roomNumber}, ${tenant.building}`,
        stayPeriod: tenant.contractStartDate && tenant.contractEndDate 
          ? `${tenant.contractStartDate} - ${tenant.contractEndDate}`
          : prev.stayPeriod,
        guestCount: tenant.hasExtraPerson ? '2' : '1'
      }));
    }
  };

  // Line items state (staff-entered figures, NO automatic VAT calculations forced)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: 'item-1',
      description: 'Monthly Serviced Residence Fee',
      amount: '1200.00',
      vatPercent: '10%',
      vatAmount: '120.00',
      extraTaxes: '0.00',
      total: '1320.00'
    }
  ]);

  // Contract Extension Form Fields
  const [extensionMonths, setExtensionMonths] = useState<number>(6);
  const [extensionNotes, setExtensionNotes] = useState<string>(
    'Lease extended under standard SEVEN ROCKS GmbH serviced residence terms. All prior deposit covenants and house rules remain in full effect.'
  );

  // Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3800);
  };

  // DUPLICATE INVOICE NUMBER PREVENTION
  const isDuplicateInvoice = useMemo(() => {
    if (docType !== 'invoice') return false;
    const cleanNum = metadata.invoiceNumber.trim().toLowerCase();
    if (!cleanNum) return false;
    return invoices.some(inv => inv.id.trim().toLowerCase() === cleanNum);
  }, [invoices, metadata.invoiceNumber, docType]);

  // Numerical parser helper
  const parseNum = (val: string | number | undefined): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  // Subtotal and Totals calculated strictly as sums of staff-entered line figures
  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + parseNum(item.amount), 0);
  }, [lineItems]);

  const totalVatAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + parseNum(item.vatAmount), 0);
  }, [lineItems]);

  const totalExtraTaxes = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + parseNum(item.extraTaxes), 0);
  }, [lineItems]);

  const invoiceGrandTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + parseNum(item.total), 0);
  }, [lineItems]);

  // Line item manipulation
  const handleAddLineItem = () => {
    setLineItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: '',
        amount: '',
        vatPercent: '10%',
        vatAmount: '',
        extraTaxes: '0.00',
        total: ''
      }
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateLineItem = (id: string, field: keyof InvoiceLineItem, val: string) => {
    setLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  // Optional convenience helper to sum row without forcing it automatically
  const handleAutoSumRow = (id: string) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const amt = parseNum(item.amount);
      const vat = parseNum(item.vatAmount);
      const extra = parseNum(item.extraTaxes);
      return {
        ...item,
        total: (amt + vat + extra).toFixed(2)
      };
    }));
  };

  // Proposed End Date for Extension
  const calculatedExtensionEndDate = useMemo(() => {
    if (!selectedTenant?.contractEndDate) return '2027-01-01';
    try {
      const parts = selectedTenant.contractEndDate.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      d.setMonth(d.getMonth() + Number(extensionMonths));
      return d.toISOString().split('T')[0];
    } catch {
      return '2027-06-30';
    }
  }, [selectedTenant, extensionMonths]);

  // Print & Generate Document
  const handleGenerateAndDownload = async () => {
    if (docType === 'invoice' && isDuplicateInvoice) {
      showToast('Error: Duplicate invoice number detected. Please enter a unique invoice number.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please enable popups in your browser to print and download the document.');
      return;
    }

    const documentTitle = docType === 'invoice'
      ? `Invoice_${metadata.invoiceNumber}_${(metadata.tenantName || 'Guest').replace(/\s+/g, '_')}`
      : `Contract_Extension_${(selectedTenant?.name || 'Guest').replace(/\s+/g, '_')}_${calculatedExtensionEndDate}`;

    const docContent = document.getElementById('generated-document-preview')?.innerHTML || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentTitle}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4 portrait;
              margin: 14mm 16mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #0f172a;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-container {
              max-width: 820px;
              margin: 0 auto;
            }
            table.invoice-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            table.invoice-table th, 
            table.invoice-table td {
              border: 1px solid #111827 !important;
              padding: 6px 8px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body>
          <div class="print-container">
            ${docContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    // Optionally record invoice if handler provided
    if (docType === 'invoice' && onCreateInvoice) {
      try {
        await onCreateInvoice({
          id: metadata.invoiceNumber,
          tenantId: selectedTenant?.id || 'manual',
          tenantName: metadata.tenantName,
          roomNumber: selectedTenant?.roomNumber || '',
          building: selectedTenant?.building || '',
          date: metadata.invDate,
          dueDate: metadata.dueDate,
          rentAmount: totalAmount,
          extraPersonSurcharge: 0,
          addOnTotal: 0,
          adminFee: 0,
          depositAmount: 0,
          subtotal: totalAmount,
          vatRate: 0,
          vatAmount: totalVatAmount,
          totalAmount: invoiceGrandTotal,
          status: 'Pending',
          type: 'Standard Invoice',
          description: lineItems.map(i => i.description).filter(Boolean).join('; ') || 'Serviced Residence Fee'
        });
      } catch (err) {
        console.warn('Optional invoice auto-record note:', err);
      }
    }

    // Log Activity
    if (onAddActivity) {
      onAddActivity(
        'billing',
        `Generated ${docType === 'invoice' ? 'Invoice' : 'Extension'} Document`,
        `Staff generated ${docType === 'invoice' ? `Invoice #${metadata.invoiceNumber} (€${invoiceGrandTotal.toFixed(2)})` : `Contract Extension (+${extensionMonths}m)`} for ${metadata.tenantName || selectedTenant?.name}.`
      );
    }

    showToast(`Document generated! Print dialog launched for download.`);
  };

  // Helper to format currency display
  const formatCellAmount = (val: string, prefix = '€') => {
    if (!val || val.trim() === '') return '-';
    const clean = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      return `${prefix}${num.toFixed(2)}`;
    }
    return val;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#3C3C2A] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold border border-white/10 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#5A5A40] rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between shadow-brand border border-[#4A4A33]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="h-6 w-6 text-emerald-300" />
            <h2 className="text-xl font-bold font-serif tracking-tight !text-white">Seven Rocks Document Generator</h2>
          </div>
          <p className="text-xs text-[#E5E0D8]/80 font-medium">
            Staff tool to generate official invoices and lease addendums with approved company details and staff-entered figures.
          </p>
        </div>

        {/* Template Upload as Future Feature */}
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <div 
            title="Custom template upload is scheduled for a future release. Currently using the single official approved template."
            className="px-3.5 py-2 bg-[#4A4A33]/70 text-[#E5E0D8]/70 text-xs font-semibold rounded-xl border border-white/10 flex items-center space-x-2 select-none cursor-not-allowed"
          >
            <Upload className="h-3.5 w-3.5 opacity-60 text-emerald-300" />
            <span>Custom Invoice Template Upload</span>
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-amber-400/20 text-amber-200 border border-amber-300/30">
              Coming Soon
            </span>
          </div>
        </div>
      </div>

      {/* Document Type Selector & Approved Template Indicator */}
      <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Toggle Mode */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setDocType('invoice')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              docType === 'invoice'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'bg-brand-surface text-brand-secondary hover:text-brand-dark border border-brand-border'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Official Invoice Generator</span>
          </button>
          <button
            type="button"
            onClick={() => setDocType('extension')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              docType === 'extension'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'bg-brand-surface text-brand-secondary hover:text-brand-dark border border-brand-border'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Contract Extension Addendum</span>
          </button>
        </div>

        {/* Approved Single Template Status Badge */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-[11px] text-brand-stone font-bold">Approved Template:</span>
          <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              {docType === 'invoice' 
                ? 'Seven Rocks Official Invoice Template (PDF Standard)' 
                : 'Seven Rocks Contract Extension Addendum (Standard)'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Layout: Staff Input Form (Left) & Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Controls - Span 5 */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-5">
            
            {/* Resident & Lease Selector */}
            <div className="space-y-3">
              <h4 className="font-bold text-brand-dark text-sm font-serif border-b border-brand-border pb-3 flex items-center justify-between">
                <span>1. Resident Profile &amp; Premises</span>
                <span className="text-[10px] font-mono text-brand-stone uppercase">Pre-fill</span>
              </h4>

              <div className="space-y-1.5 text-xs">
                <label className="block font-bold text-brand-stone">Select Resident Profile</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-xl p-2.5 font-medium text-brand-dark focus:outline-none"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} &bull; Unit {t.roomNumber} ({t.building})</option>
                  ))}
                </select>
              </div>

              {selectedTenant && (
                <div className="p-3 bg-brand-surface rounded-xl border border-brand-border text-[11px] space-y-1 text-brand-secondary">
                  <div className="flex justify-between">
                    <span>Lease Period:</span>
                    <strong className="font-mono text-brand-dark">{selectedTenant.contractStartDate} &rarr; {selectedTenant.contractEndDate}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Premises:</span>
                    <strong className="text-brand-dark">Unit {selectedTenant.roomNumber} &bull; {selectedTenant.building}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Contact:</span>
                    <strong className="font-mono text-brand-dark">{selectedTenant.email}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* DOCUMENT-SPECIFIC FORMS */}
            {docType === 'invoice' ? (
              /* --- INVOICE GENERATOR FORM --- */
              <div className="space-y-5 pt-2 border-t border-brand-border">
                <div className="flex items-center justify-between border-b border-brand-border pb-3">
                  <h4 className="font-bold text-brand-dark text-sm font-serif">
                    2. Invoice Metadata Fields
                  </h4>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                    PDF Approved
                  </span>
                </div>

                {/* Duplicate Invoice Number Prevention */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-brand-stone">Invoice no.</label>
                    {isDuplicateInvoice && (
                      <span className="text-[10px] text-rose-700 font-bold flex items-center space-x-1 animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Duplicate Number Detected</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={metadata.invoiceNumber}
                    onChange={(e) => setMetadata({ ...metadata, invoiceNumber: e.target.value })}
                    placeholder="e.g. SR202610002"
                    className={`w-full bg-brand-surface border rounded-xl p-2.5 font-mono text-xs font-bold text-brand-dark focus:outline-none ${
                      isDuplicateInvoice 
                        ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-1 focus:ring-rose-500' 
                        : 'border-brand-border focus:border-brand-primary'
                    }`}
                  />
                  {isDuplicateInvoice && (
                    <p className="text-[10.5px] text-rose-700 font-medium leading-relaxed bg-rose-50 p-2 rounded-lg border border-rose-200">
                      ⚠️ <strong>Duplicate Prevention Rule:</strong> Invoice number <strong>{metadata.invoiceNumber}</strong> is already recorded. Invoices must have unique identifiers.
                    </p>
                  )}
                </div>

                {/* Dates: Inv. Date & Due Date */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block font-bold text-brand-stone">Inv. Date</label>
                    <input
                      type="date"
                      value={metadata.invDate}
                      onChange={(e) => setMetadata({ ...metadata, invDate: e.target.value })}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-brand-stone">Due Date</label>
                    <input
                      type="date"
                      value={metadata.dueDate}
                      onChange={(e) => setMetadata({ ...metadata, dueDate: e.target.value })}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark focus:outline-none"
                    />
                  </div>
                </div>

                {/* Stay Period & Guest Count */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block font-bold text-brand-stone">Stay Period</label>
                    <input
                      type="text"
                      value={metadata.stayPeriod}
                      onChange={(e) => setMetadata({ ...metadata, stayPeriod: e.target.value })}
                      placeholder="e.g. 01.10.2026 - 31.10.2026"
                      className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-brand-stone">Guest Count</label>
                    <input
                      type="text"
                      value={metadata.guestCount}
                      onChange={(e) => setMetadata({ ...metadata, guestCount: e.target.value })}
                      placeholder="e.g. 1"
                      className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tenant Name & Accommodation */}
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="block font-bold text-brand-stone">Tenant Name</label>
                    <input
                      type="text"
                      value={metadata.tenantName}
                      onChange={(e) => setMetadata({ ...metadata, tenantName: e.target.value })}
                      placeholder="Full Tenant Name"
                      className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-brand-stone">Accommodation</label>
                    <input
                      type="text"
                      value={metadata.accommodation}
                      onChange={(e) => setMetadata({ ...metadata, accommodation: e.target.value })}
                      placeholder="Unit Number, Building Name"
                      className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tenant Contact & Tax ID (To Block) */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block font-bold text-brand-stone">Tenant Email (E:)</label>
                    <input
                      type="email"
                      value={metadata.tenantEmail}
                      onChange={(e) => setMetadata({ ...metadata, tenantEmail: e.target.value })}
                      placeholder="tenant@email.com"
                      className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-brand-stone">Tenant Phone (T:)</label>
                    <input
                      type="text"
                      value={metadata.tenantPhone}
                      onChange={(e) => setMetadata({ ...metadata, tenantPhone: e.target.value })}
                      placeholder="+43 660..."
                      className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="block font-bold text-brand-stone">Tenant Tax ID (UID-Nr.:)</label>
                  <input
                    type="text"
                    value={metadata.tenantUid}
                    onChange={(e) => setMetadata({ ...metadata, tenantUid: e.target.value })}
                    placeholder="e.g. ATU83198969"
                    className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark focus:outline-none"
                  />
                </div>

                {/* 3. LINE ITEMS (STAFF ENTERED FIGURES - NO AUTOMATIC VAT) */}
                <div className="space-y-3 pt-3 border-t border-brand-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-brand-dark text-sm font-serif">
                        3. Table Line Items (Staff-Entered)
                      </h4>
                      <p className="text-[10px] text-brand-stone">
                        All figures are staff-entered per the approved template. No automatic VAT rate formulas are applied to totals.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="px-2.5 py-1.5 bg-brand-surface border border-brand-border hover:bg-slate-100 rounded-lg text-xs font-bold text-brand-primary flex items-center space-x-1 cursor-pointer transition-colors shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Row</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {lineItems.map((item, idx) => (
                      <div 
                        key={item.id} 
                        className="p-3 bg-brand-surface rounded-xl border border-brand-border space-y-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-700">
                          <span className="font-mono text-[11px] text-brand-stone">Sl. No. {idx + 1}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleAutoSumRow(item.id)}
                              title="Optional: Calculate Total = Amount + VAT Amount + Extra Taxes for this row"
                              className="text-[10.5px] text-brand-primary hover:underline flex items-center space-x-1 font-semibold"
                            >
                              <Calculator className="h-3 w-3" />
                              <span>Sum Row</span>
                            </button>
                            {lineItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(item.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-[10px] font-bold text-brand-stone mb-1">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                            placeholder="e.g. Monthly Serviced Residence Fee"
                            className="w-full bg-white border border-brand-border rounded-lg p-2 text-xs font-medium text-brand-dark focus:outline-none"
                          />
                        </div>

                        {/* Financial Inputs: Amount, VAT%, VAT Amount, Extra Taxes, Total */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-brand-stone mb-1">Amount</label>
                            <input
                              type="text"
                              value={item.amount}
                              onChange={(e) => handleUpdateLineItem(item.id, 'amount', e.target.value)}
                              placeholder="1200.00"
                              className="w-full bg-white border border-brand-border rounded-lg p-1.5 font-mono text-xs font-semibold text-brand-dark focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-brand-stone mb-1">VAT%</label>
                            <input
                              type="text"
                              value={item.vatPercent}
                              onChange={(e) => handleUpdateLineItem(item.id, 'vatPercent', e.target.value)}
                              placeholder="10%"
                              className="w-full bg-white border border-brand-border rounded-lg p-1.5 font-mono text-xs text-brand-dark focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-brand-stone mb-1">VAT Amount</label>
                            <input
                              type="text"
                              value={item.vatAmount}
                              onChange={(e) => handleUpdateLineItem(item.id, 'vatAmount', e.target.value)}
                              placeholder="120.00"
                              className="w-full bg-white border border-brand-border rounded-lg p-1.5 font-mono text-xs font-semibold text-brand-dark focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-brand-stone mb-1">Extra Taxes</label>
                            <input
                              type="text"
                              value={item.extraTaxes}
                              onChange={(e) => handleUpdateLineItem(item.id, 'extraTaxes', e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-white border border-brand-border rounded-lg p-1.5 font-mono text-xs text-brand-dark focus:outline-none"
                            />
                          </div>

                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[10px] font-bold text-emerald-800 mb-1">Total</label>
                            <input
                              type="text"
                              value={item.total}
                              onChange={(e) => handleUpdateLineItem(item.id, 'total', e.target.value)}
                              placeholder="1320.00"
                              className="w-full bg-white border border-emerald-300 rounded-lg p-1.5 font-mono text-xs font-bold text-emerald-900 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Totals of Staff Entered Figures */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Sum of Line Amounts:</span>
                      <span className="font-mono font-bold">€{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Sum of VAT Amounts:</span>
                      <span className="font-mono font-bold">€{totalVatAmount.toFixed(2)}</span>
                    </div>
                    {totalExtraTaxes > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Sum of Extra Taxes:</span>
                        <span className="font-mono font-bold">€{totalExtraTaxes.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-1.5">
                      <span>Invoice Total (Sum of Line Totals):</span>
                      <span className="font-mono text-emerald-800">€{invoiceGrandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Company & Bank Notice (Read-only reference) */}
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-brand-border/60 text-[11px] space-y-1 text-brand-stone">
                  <p className="font-bold text-brand-dark">Bank Details on Approved Template:</p>
                  <p className="font-mono text-[10px]">
                    {OFFICIAL_COMPANY_DETAILS.bank} &bull; IBAN: {OFFICIAL_COMPANY_DETAILS.iban} &bull; BIC: {OFFICIAL_COMPANY_DETAILS.bic}
                  </p>
                </div>
              </div>
            ) : (
              /* --- CONTRACT EXTENSION FORM --- */
              <div className="space-y-4 pt-2 border-t border-brand-border">
                <h4 className="font-bold text-brand-dark text-sm font-serif">
                  2. Stay Extension Parameters
                </h4>

                <div className="space-y-1.5 text-xs">
                  <label className="block font-bold text-brand-stone">Extension Duration</label>
                  <select
                    value={extensionMonths}
                    onChange={(e) => setExtensionMonths(Number(e.target.value))}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl p-2.5 text-xs font-medium text-brand-dark"
                  >
                    <option value={1}>+1 Month Extension</option>
                    <option value={2}>+2 Months Extension</option>
                    <option value={3}>+3 Months Extension</option>
                    <option value={6}>+6 Months Extension (Standard)</option>
                    <option value={12}>+12 Months Extension (Full Year)</option>
                  </select>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900 font-medium">
                  <div className="flex justify-between">
                    <span>Current Lease End Date:</span>
                    <strong className="font-mono">{selectedTenant?.contractEndDate}</strong>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200/80 pt-1">
                    <span>Amended Terminus Date:</span>
                    <strong className="font-mono text-emerald-900">{calculatedExtensionEndDate}</strong>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="block font-bold text-brand-stone">Addendum Clauses / Covenants</label>
                  <textarea
                    rows={3}
                    value={extensionNotes}
                    onChange={(e) => setExtensionNotes(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs text-brand-dark font-medium leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Print & Download Action Button */}
            <div className="pt-3 border-t border-brand-border">
              <button
                type="button"
                disabled={docType === 'invoice' && isDuplicateInvoice}
                onClick={handleGenerateAndDownload}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-brand ${
                  docType === 'invoice' && isDuplicateInvoice
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-brand-primary hover:bg-[#4E4E37] text-white'
                }`}
              >
                <Printer className="h-4 w-4" />
                <span>Generate &amp; Download Document (PDF)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Document Preview (Right Column - Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-stone uppercase tracking-wider flex items-center space-x-1.5">
              <Eye className="h-4 w-4 text-brand-primary" />
              <span>Approved Template Live Render (Print Ready)</span>
            </span>
            <span className="text-[10px] text-brand-stone bg-brand-surface border border-brand-border px-2 py-0.5 rounded font-mono">
              A4 Standard Layout
            </span>
          </div>

          {/* Document Preview Sheet */}
          <div 
            id="generated-document-preview"
            className="bg-white p-8 md:p-12 rounded-2xl border border-brand-border shadow-lg min-h-[750px] text-slate-900 text-xs font-sans space-y-6"
          >
            {docType === 'invoice' ? (
              /* =========================================================================
                 OFFICIAL SEVEN ROCKS INVOICE TEMPLATE (MATCHING Invoice Template.pdf)
                 ========================================================================= */
              <div className="space-y-6">
                
                {/* Top Section: Brand & Company Info (Left) + Invoice Metadata (Right) */}
                <div className="flex justify-between items-start gap-4">
                  
                  {/* Left: Logo & Company Address */}
                  <div className="space-y-4 max-w-[280px]">
                    {/* Seven Rocks Logo & Brand Title */}
                    <div className="flex items-center space-x-2.5">
                      <SevenRocksLogo className="h-10 w-10 text-[#A4854E]" />
                      <div className="flex flex-col">
                        <span className="font-serif text-lg tracking-[0.18em] font-bold text-[#A4854E] uppercase leading-tight">
                          Seven Rocks
                        </span>
                        <span className="text-[7.5px] tracking-[0.25em] text-[#8C733E] uppercase font-sans font-semibold">
                          Serviced Residences
                        </span>
                      </div>
                    </div>

                    {/* Company Details */}
                    <div className="text-[11px] leading-relaxed text-slate-800 space-y-0.5">
                      <p className="font-bold text-slate-900">{OFFICIAL_COMPANY_DETAILS.name}</p>
                      <p>{OFFICIAL_COMPANY_DETAILS.addressLine1}</p>
                      <p>{OFFICIAL_COMPANY_DETAILS.addressCity}</p>
                      <p><span className="font-semibold text-slate-700">E:</span> {OFFICIAL_COMPANY_DETAILS.email}</p>
                      <p><span className="font-semibold text-slate-700">T:</span> {OFFICIAL_COMPANY_DETAILS.phone}</p>
                      <p><span className="font-semibold text-slate-700">UID-Nr.:</span> {OFFICIAL_COMPANY_DETAILS.uidNr}</p>
                    </div>

                    {/* Recipient "To" Section */}
                    <div className="pt-2 text-[11px] leading-relaxed text-slate-800 space-y-0.5">
                      <p className="font-bold text-slate-900">To</p>
                      <p className="font-semibold text-slate-900">{metadata.tenantName || '—'}</p>
                      <p><span className="font-semibold text-slate-700">E:</span> {metadata.tenantEmail || '—'}</p>
                      <p><span className="font-semibold text-slate-700">T:</span> {metadata.tenantPhone || '—'}</p>
                      <p><span className="font-semibold text-slate-700">UID-Nr.:</span> {metadata.tenantUid || '—'}</p>
                    </div>
                  </div>

                  {/* Right: "Invoice" Title & Aligned Metadata Grid */}
                  <div className="text-right space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold font-sans text-slate-900 tracking-tight">
                      Invoice
                    </h1>

                    <div className="inline-block text-left text-[11px] leading-relaxed text-slate-800 pt-1">
                      <div className="grid grid-cols-[105px_10px_auto] gap-y-1">
                        <span className="font-medium text-slate-700">Invoice no.</span>
                        <span>:</span>
                        <span className="font-bold font-mono text-slate-900">{metadata.invoiceNumber}</span>

                        <span className="font-medium text-slate-700">Inv. Date</span>
                        <span>:</span>
                        <span className="text-slate-900">{metadata.invDate}</span>

                        <span className="font-medium text-slate-700">Due Date</span>
                        <span>:</span>
                        <span className="text-slate-900">{metadata.dueDate}</span>

                        <span className="font-medium text-slate-700">Stay Period</span>
                        <span>:</span>
                        <span className="text-slate-900">{metadata.stayPeriod}</span>

                        <span className="font-medium text-slate-700">Guest Count</span>
                        <span>:</span>
                        <span className="text-slate-900">{metadata.guestCount}</span>

                        <span className="font-medium text-slate-700">Tenant Name</span>
                        <span>:</span>
                        <span className="font-semibold text-slate-900">{metadata.tenantName}</span>

                        <span className="font-medium text-slate-700">Accommodation</span>
                        <span>:</span>
                        <span className="text-slate-900">{metadata.accommodation}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Table: Sl. No. | Description | Amount | VAT% | VAT Amount | Extra Taxes | Total */}
                <div className="mt-6">
                  <table 
                    className="w-full text-left text-[11px] border-collapse invoice-table border border-slate-900" 
                    style={{ border: '1px solid #0f172a' }}
                  >
                    <thead>
                      <tr className="bg-slate-50 text-slate-900 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-2 border border-slate-900 text-center w-12">Sl. No.</th>
                        <th className="py-2.5 px-3 border border-slate-900">Description</th>
                        <th className="py-2.5 px-3 border border-slate-900 text-right w-24">Amount</th>
                        <th className="py-2.5 px-2 border border-slate-900 text-center w-16">VAT%</th>
                        <th className="py-2.5 px-3 border border-slate-900 text-right w-24">VAT Amount</th>
                        <th className="py-2.5 px-3 border border-slate-900 text-right w-24">Extra Taxes</th>
                        <th className="py-2.5 px-3 border border-slate-900 text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Staff-entered rows */}
                      {lineItems.map((item, index) => (
                        <tr key={item.id} className="text-slate-800">
                          <td className="py-2 px-2 border border-slate-900 text-center font-mono">{index + 1}</td>
                          <td className="py-2 px-3 border border-slate-900 font-medium">{item.description || '—'}</td>
                          <td className="py-2 px-3 border border-slate-900 text-right font-mono">{formatCellAmount(item.amount)}</td>
                          <td className="py-2 px-2 border border-slate-900 text-center font-mono">{item.vatPercent || '—'}</td>
                          <td className="py-2 px-3 border border-slate-900 text-right font-mono">{formatCellAmount(item.vatAmount)}</td>
                          <td className="py-2 px-3 border border-slate-900 text-right font-mono">{formatCellAmount(item.extraTaxes)}</td>
                          <td className="py-2 px-3 border border-slate-900 text-right font-mono font-bold text-slate-900">{formatCellAmount(item.total)}</td>
                        </tr>
                      ))}

                      {/* Empty filler rows to match the official PDF layout structure */}
                      {Array.from({ length: Math.max(0, 3 - lineItems.length) }).map((_, fIdx) => (
                        <tr key={`filler-${fIdx}`} className="h-8">
                          <td className="border border-slate-900 py-2 px-2">&nbsp;</td>
                          <td className="border border-slate-900 py-2 px-3">&nbsp;</td>
                          <td className="border border-slate-900 py-2 px-3">&nbsp;</td>
                          <td className="border border-slate-900 py-2 px-2">&nbsp;</td>
                          <td className="border border-slate-900 py-2 px-3">&nbsp;</td>
                          <td className="border border-slate-900 py-2 px-3">&nbsp;</td>
                          <td className="border border-slate-900 py-2 px-3">&nbsp;</td>
                        </tr>
                      ))}

                      {/* Total Row matching standard invoice accounting */}
                      <tr className="bg-slate-50 font-bold text-slate-900">
                        <td colSpan={2} className="py-2.5 px-3 border border-slate-900 text-right font-serif">
                          Total (EUR):
                        </td>
                        <td className="py-2.5 px-3 border border-slate-900 text-right font-mono">
                          €{totalAmount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 border border-slate-900 text-center font-mono">
                          -
                        </td>
                        <td className="py-2.5 px-3 border border-slate-900 text-right font-mono">
                          €{totalVatAmount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 border border-slate-900 text-right font-mono">
                          €{totalExtraTaxes.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 border border-slate-900 text-right font-mono text-emerald-900 text-xs">
                          €{invoiceGrandTotal.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bank Details Section */}
                <div className="pt-6 space-y-2 text-[11px] text-slate-800">
                  <h3 className="font-bold text-slate-900 text-xs">Bank Details</h3>
                  <div className="grid grid-cols-[105px_auto] gap-y-1 leading-relaxed">
                    <span className="font-medium text-slate-700">Bank</span>
                    <span className="font-semibold text-slate-900">{OFFICIAL_COMPANY_DETAILS.bank}</span>

                    <span className="font-medium text-slate-700">Account Name</span>
                    <span className="font-semibold text-slate-900">{OFFICIAL_COMPANY_DETAILS.accountName}</span>

                    <span className="font-medium text-slate-700">IBAN</span>
                    <span className="font-mono font-bold text-slate-900">{OFFICIAL_COMPANY_DETAILS.iban}</span>

                    <span className="font-medium text-slate-700">BIC</span>
                    <span className="font-mono font-bold text-slate-900">{OFFICIAL_COMPANY_DETAILS.bic}</span>
                  </div>
                </div>

                {/* Footer Section: "Thank you for choosing Seven Rocks Vienna!" + Company/Bank footer */}
                <div className="pt-10 space-y-4">
                  <p className="text-center text-xs font-semibold text-slate-900 italic">
                    {OFFICIAL_COMPANY_DETAILS.tagline}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[9.5px] leading-relaxed text-slate-600 border-t border-slate-200 pt-3">
                    <div>
                      <p className="font-bold text-slate-900">{OFFICIAL_COMPANY_DETAILS.name}</p>
                      <p>{OFFICIAL_COMPANY_DETAILS.fullAddress}</p>
                      <p>{OFFICIAL_COMPANY_DETAILS.infoEmail}</p>
                    </div>

                    <div>
                      <p><span className="font-medium text-slate-700">USt:</span> {OFFICIAL_COMPANY_DETAILS.uidNr}</p>
                      <p className="font-semibold text-slate-800">{OFFICIAL_COMPANY_DETAILS.bank}</p>
                      <p>{OFFICIAL_COMPANY_DETAILS.accountName}</p>
                    </div>

                    <div>
                      <p><span className="font-medium text-slate-700">IBAN:</span> {OFFICIAL_COMPANY_DETAILS.iban}</p>
                      <p><span className="font-medium text-slate-700">BIC:</span> {OFFICIAL_COMPANY_DETAILS.bic}</p>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              /* =========================================================================
                 CONTRACT EXTENSION ADDENDUM (PRESERVED & STYLED)
                 ========================================================================= */
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <SevenRocksLogo className="h-6 w-6 text-[#A4854E]" />
                      <h1 className="font-serif text-lg font-bold text-slate-900 tracking-wide">
                        {OFFICIAL_COMPANY_DETAILS.name}
                      </h1>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                      {OFFICIAL_COMPANY_DETAILS.fullAddress} &bull; UID: {OFFICIAL_COMPANY_DETAILS.uidNr}<br />
                      {OFFICIAL_COMPANY_DETAILS.email} &bull; Tel: {OFFICIAL_COMPANY_DETAILS.phone}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-mono font-bold text-xs uppercase tracking-wider rounded">
                      LEASE ADDENDUM
                    </span>
                    <p className="text-[11px] font-mono font-extrabold text-slate-900">
                      EXT-{selectedTenant?.id || '2026'}
                    </p>
                  </div>
                </div>

                {/* Resident Recipient Block */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400">RESIDENT DETAILS</span>
                    <p className="font-bold text-slate-900 text-sm">{selectedTenant?.name}</p>
                    <p className="text-slate-600 font-mono text-[11px]">{selectedTenant?.email}</p>
                    <p className="text-slate-600 font-mono text-[11px]">{selectedTenant?.phone}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400">ALLOCATED PREMISES</span>
                    <p className="font-bold text-slate-900 text-sm">Unit {selectedTenant?.roomNumber}</p>
                    <p className="text-slate-600">{selectedTenant?.building || 'Main Complex'}</p>
                    <p className="text-slate-500 text-[10px]">Seven Rocks Vienna Portfolio</p>
                  </div>
                </div>

                {/* Addendum Body */}
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                      Addendum to Residential Lease Agreement
                    </h4>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      This addendum formally extends the residential lease term executed between <strong>{OFFICIAL_COMPANY_DETAILS.name}</strong> (&quot;Landlord&quot;) and <strong>{selectedTenant?.name}</strong> (&quot;Resident&quot;) for the premises referenced above.
                    </p>
                  </div>

                  <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <tbody className="divide-y divide-slate-200 text-xs">
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-bold text-slate-600 w-1/3">Extension Term:</td>
                        <td className="p-2.5 font-bold text-slate-900">+{extensionMonths} Additional Months</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-bold text-slate-600">Original End Date:</td>
                        <td className="p-2.5 font-mono text-slate-800">{selectedTenant?.contractEndDate}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-bold text-slate-600">Amended Lease Terminus:</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-800">{calculatedExtensionEndDate}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-bold text-slate-600">Premises Unit:</td>
                        <td className="p-2.5 text-slate-800">Unit {selectedTenant?.roomNumber} ({selectedTenant?.building})</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] space-y-1">
                    <p className="font-bold text-slate-700">Special Covenants &amp; Declarations:</p>
                    <p className="text-slate-600 text-[10px] leading-relaxed">{extensionNotes}</p>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-[10px]">
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider mb-8">AUTHORIZED LANDLORD SIGNATURE</p>
                    <div className="border-t border-slate-400 pt-1 flex justify-between">
                      <span className="font-serif italic font-bold text-slate-800">{OFFICIAL_COMPANY_DETAILS.name}</span>
                      <span className="text-slate-400 font-mono">{defaultIssueDate}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 uppercase tracking-wider mb-8">RESIDENT ACKNOWLEDGEMENT</p>
                    <div className="border-t border-slate-400 pt-1 flex justify-between">
                      <span className="font-bold text-slate-800">{selectedTenant?.name}</span>
                      <span className="text-slate-400 font-mono">{defaultIssueDate}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
