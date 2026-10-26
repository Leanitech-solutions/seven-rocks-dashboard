"use client";

import React, { useState, useMemo } from 'react';
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
  FileCheck, 
  ShieldAlert, 
  Printer,
  Sparkles,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { Tenant, Invoice } from '../types';
import { SevenRocksLogo } from './SevenRocksLogo';

interface DocumentGeneratorViewProps {
  tenants: Tenant[];
  invoices: Invoice[];
  onCreateInvoice?: (invoice: any) => Promise<any>;
  onAddActivity?: (type: 'tenant' | 'billing' | 'ticket' | 'notification' | 'addon', action: string, details: string) => void;
}

interface TemplateRecord {
  id: string;
  name: string;
  type: 'invoice' | 'extension';
  uploadedAt: string;
  uploadedBy: string;
  fileSize: string;
  status: 'Approved' | 'Active';
}

const DEFAULT_TEMPLATES: TemplateRecord[] = [
  {
    id: 'tmpl-inv-01',
    name: 'Seven_Rocks_Official_Invoice_Template_2026.docx',
    type: 'invoice',
    uploadedAt: '2026-08-15',
    uploadedBy: 'Finance Ops',
    fileSize: '48 KB',
    status: 'Active'
  },
  {
    id: 'tmpl-ext-01',
    name: 'Seven_Rocks_Contract_Extension_Addendum_v2.docx',
    type: 'extension',
    uploadedAt: '2026-09-02',
    uploadedBy: 'Legal Team',
    fileSize: '54 KB',
    status: 'Active'
  }
];

export default function DocumentGeneratorView({
  tenants,
  invoices,
  onCreateInvoice,
  onAddActivity
}: DocumentGeneratorViewProps) {
  const [docType, setDocType] = useState<'invoice' | 'extension'>('invoice');
  const [templates, setTemplates] = useState<TemplateRecord[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-inv-01');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || '');

  // Invoice Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState<string>('INV-2026-901');
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [invoiceItems, setInvoiceItems] = useState<{ desc: string; amount: number }[]>([
    { desc: 'Monthly Co-Living Residence Fee', amount: 1200 }
  ]);
  const [vatRate, setVatRate] = useState<number>(10);
  const [invoiceNotes, setInvoiceNotes] = useState<string>('Bank Transfer to AT89 3200 0000 1234 5678 within 14 calendar days.');

  // Contract Extension Form Fields
  const [extensionMonths, setExtensionMonths] = useState<number>(6);
  const [extensionNotes, setExtensionNotes] = useState<string>('Lease extended under standard house rules. All previous security covenants remain intact.');

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const selectedTenant = useMemo(() => {
    return tenants.find(t => t.id === selectedTenantId) || tenants[0] || null;
  }, [tenants, selectedTenantId]);

  // DUPLICATE INVOICE NUMBER PREVENTION
  const isDuplicateInvoice = useMemo(() => {
    if (docType !== 'invoice') return false;
    const cleanNum = invoiceNumber.trim().toLowerCase();
    if (!cleanNum) return false;
    return invoices.some(inv => inv.id.trim().toLowerCase() === cleanNum);
  }, [invoices, invoiceNumber, docType]);

  // Invoice subtotal and total calculations
  const invoiceSubtotal = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [invoiceItems]);

  const invoiceVatAmount = useMemo(() => {
    return (invoiceSubtotal * vatRate) / 100;
  }, [invoiceSubtotal, vatRate]);

  const invoiceTotal = useMemo(() => {
    return invoiceSubtotal + invoiceVatAmount;
  }, [invoiceSubtotal, invoiceVatAmount]);

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

  // Add Item
  const handleAddInvoiceItem = () => {
    setInvoiceItems(prev => [...prev, { desc: 'Additional Service / Facility Charge', amount: 50 }]);
  };

  // Remove Item
  const handleRemoveInvoiceItem = (index: number) => {
    if (invoiceItems.length <= 1) return;
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Template Upload
  const handleUploadTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFileName.trim()) return;

    const newTmpl: TemplateRecord = {
      id: `tmpl-user-${Date.now()}`,
      name: uploadedFileName.endsWith('.docx') ? uploadedFileName : `${uploadedFileName}.docx`,
      type: docType,
      uploadedAt: new Date().toISOString().split('T')[0],
      uploadedBy: 'Ops Staff',
      fileSize: '52 KB',
      status: 'Active'
    };

    setTemplates(prev => [newTmpl, ...prev]);
    setSelectedTemplateId(newTmpl.id);
    setShowUploadModal(false);
    setUploadedFileName('');
    showToast(`Template "${newTmpl.name}" registered and set as active.`);
  };

  // Print / Download Document
  const handleGenerateAndDownload = async () => {
    if (docType === 'invoice' && isDuplicateInvoice) {
      showToast('Error: Duplicate invoice number detected. Please enter a unique invoice number.');
      return;
    }

    // Trigger printable document window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please enable popups to download and print the document.');
      return;
    }

    const documentTitle = docType === 'invoice'
      ? `Invoice_${invoiceNumber}_${selectedTenant?.name?.replace(/\s+/g, '_')}`
      : `Contract_Extension_${selectedTenant?.name?.replace(/\s+/g, '_')}_${calculatedExtensionEndDate}`;

    const docContent = document.getElementById('generated-document-preview')?.innerHTML || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentTitle}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; background: #fff; }
            .print-container { max-width: 800px; margin: 0 auto; }
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
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

    // Log Activity
    if (onAddActivity) {
      onAddActivity(
        'billing',
        `Generated ${docType === 'invoice' ? 'Invoice' : 'Extension'} Document`,
        `Staff generated ${docType === 'invoice' ? `Invoice #${invoiceNumber}` : `Contract Extension (+${extensionMonths}m)`} for ${selectedTenant?.name}.`
      );
    }

    showToast(`Document generated! Print dialog launched for download.`);
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
            <h2 className="text-xl font-bold font-serif tracking-tight !text-white">Internal Document Generator</h2>
          </div>
          <p className="text-xs text-[#E5E0D8]/80 font-medium">
            Staff-only tool to upload approved templates, populate verified lease details, and generate downloadable PDFs.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-[#4A4A33] hover:bg-[#3D3D2A] text-white text-xs font-bold rounded-xl border border-white/15 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-300" />
            <span>Upload Approved Template</span>
          </button>
        </div>
      </div>

      {/* Document Type Selector & Template Bar */}
      <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Toggle Mode */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              setDocType('invoice');
              const tmpl = templates.find(t => t.type === 'invoice');
              if (tmpl) setSelectedTemplateId(tmpl.id);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              docType === 'invoice'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'bg-brand-surface text-brand-secondary hover:text-brand-dark border border-brand-border'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Invoice Document Generator</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDocType('extension');
              const tmpl = templates.find(t => t.type === 'extension');
              if (tmpl) setSelectedTemplateId(tmpl.id);
            }}
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

        {/* Selected Template Badge */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-[11px] text-brand-stone font-bold">Active Template:</span>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="bg-brand-surface border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-brand-dark font-medium focus:outline-none"
          >
            {templates.filter(t => t.type === docType).map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.uploadedAt})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Form Input (Left) & Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Inputs - Span 5 */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-5">
            <h4 className="font-bold text-brand-dark text-sm font-serif border-b border-brand-border pb-3">
              1. Resident &amp; Lease Selection
            </h4>

            {/* Resident Selector */}
            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-brand-stone">Select Resident Profile</label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
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
                  <span>Current Lease Period:</span>
                  <strong className="font-mono text-brand-dark">{selectedTenant.contractStartDate} &rarr; {selectedTenant.contractEndDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Premises:</span>
                  <strong className="text-brand-dark">{selectedTenant.roomNumber} &bull; {selectedTenant.building}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Resident Email:</span>
                  <strong className="font-mono text-brand-dark">{selectedTenant.email}</strong>
                </div>
              </div>
            )}

            {/* DOCUMENT SPECIFIC FORM FIELDS */}
            {docType === 'invoice' ? (
              /* --- INVOICE GENERATOR FORM --- */
              <div className="space-y-4 pt-2 border-t border-brand-border">
                <h4 className="font-bold text-brand-dark text-sm font-serif">
                  2. Invoice Parameters
                </h4>

                {/* Duplicate Invoice Number Input */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-brand-stone">Invoice Number</label>
                    {isDuplicateInvoice && (
                      <span className="text-[10px] text-rose-700 font-bold flex items-center space-x-1 animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Duplicate Number Detected</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-901"
                    className={`w-full bg-brand-surface border rounded-xl p-2.5 font-mono text-xs font-bold text-brand-dark focus:outline-none ${
                      isDuplicateInvoice 
                        ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-1 focus:ring-rose-500' 
                        : 'border-brand-border focus:border-brand-primary'
                    }`}
                  />
                  {isDuplicateInvoice && (
                    <p className="text-[10.5px] text-rose-700 font-medium leading-relaxed bg-rose-50 p-2 rounded-lg border border-rose-200">
                      ⚠️ <strong>Duplicate Prevention Rule:</strong> Invoice ID <strong>{invoiceNumber}</strong> is already logged in the system records. Invoices must have unique identifiers before generating.
                    </p>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="block font-bold text-brand-stone">Issue Date</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-brand-stone">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-2 pt-2 border-t border-brand-border">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-brand-stone">Line Items</label>
                    <button
                      type="button"
                      onClick={handleAddInvoiceItem}
                      className="text-[10px] text-brand-primary font-bold hover:underline flex items-center space-x-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {invoiceItems.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs">
                        <input
                          type="text"
                          value={item.desc}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, desc: val } : it));
                          }}
                          placeholder="Description..."
                          className="flex-1 bg-brand-surface border border-brand-border rounded-lg p-1.5 text-xs text-brand-dark font-medium"
                        />
                        <div className="w-24 relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-brand-stone text-xs font-mono">€</span>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, amount: val } : it));
                            }}
                            className="w-full bg-brand-surface border border-brand-border rounded-lg p-1.5 pl-6 text-xs text-brand-dark font-mono font-bold"
                          />
                        </div>
                        {invoiceItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInvoiceItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* VAT Rate Selection */}
                <div className="space-y-1 text-xs">
                  <label className="block font-bold text-brand-stone">VAT / Tax Treatment</label>
                  <select
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs font-medium text-brand-dark"
                  >
                    <option value={10}>10% Standard Residential VAT</option>
                    <option value={20}>20% Commercial / Services VAT</option>
                    <option value={0}>0% Tax Exempt / Reverse Charge</option>
                  </select>
                </div>

                {/* Payment Notes */}
                <div className="space-y-1 text-xs">
                  <label className="block font-bold text-brand-stone">Payment Notes &amp; Wire Instructions</label>
                  <textarea
                    rows={2}
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs text-brand-dark font-medium"
                  />
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
                    <span>Current End Date:</span>
                    <strong className="font-mono">{selectedTenant?.contractEndDate}</strong>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200/80 pt-1">
                    <span>Calculated New End Date:</span>
                    <strong className="font-mono text-emerald-900">{calculatedExtensionEndDate}</strong>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="block font-bold text-brand-stone">Addendum Clauses / Notes</label>
                  <textarea
                    rows={3}
                    value={extensionNotes}
                    onChange={(e) => setExtensionNotes(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl p-2 text-xs text-brand-dark font-medium leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Generate Action Button */}
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

        {/* Live Document Preview - Span 7 */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-stone uppercase tracking-wider flex items-center space-x-1.5">
              <Eye className="h-4 w-4 text-brand-primary" />
              <span>Document Render Preview (Print Ready)</span>
            </span>
            <span className="text-[10px] text-brand-stone">Standard A4 Layout</span>
          </div>

          <div 
            id="generated-document-preview"
            className="bg-white p-8 md:p-10 rounded-2xl border border-brand-border shadow-md min-h-[600px] text-slate-800 text-xs font-sans space-y-6"
          >
            {/* Document Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-[#5A5A40] text-white rounded-lg">
                    <SevenRocksLogo className="h-5 w-5" />
                  </div>
                  <h1 className="font-serif text-lg font-bold text-slate-900 tracking-wide">Seven Rocks Co-Living</h1>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Seven Rocks Hospitality &bull; Sechskrügelgasse 12, 1030 Vienna, Austria<br />
                  Registration: FN 492810a &bull; info@sevenrocksvienna.com
                </p>
              </div>

              <div className="text-right space-y-1">
                <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-mono font-bold text-xs uppercase tracking-wider rounded">
                  {docType === 'invoice' ? 'OFFICIAL INVOICE' : 'LEASE ADDENDUM'}
                </span>
                {docType === 'invoice' ? (
                  <p className="text-[11px] font-mono font-extrabold text-slate-900">{invoiceNumber}</p>
                ) : (
                  <p className="text-[11px] font-mono font-extrabold text-slate-900">EXT-{selectedTenant?.id || '2026'}</p>
                )}
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
                <p className="text-slate-500 text-[10px]">Vienna Co-Living Portfolio</p>
              </div>
            </div>

            {/* DOCUMENT BODY CONTENT */}
            {docType === 'invoice' ? (
              /* --- INVOICE TABLE --- */
              <div className="space-y-4">
                <div className="flex justify-between text-[11px] text-slate-600 border-b border-slate-100 pb-2">
                  <span><strong>Issue Date:</strong> {issueDate}</span>
                  <span><strong>Payment Due:</strong> {dueDate}</span>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600 uppercase text-[10px] font-bold">
                      <th className="py-2">Item Description</th>
                      <th className="py-2 text-right">Amount (EUR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoiceItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 text-slate-800 font-medium">{item.desc}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">€{Number(item.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Subtotal, VAT, Total Box */}
                <div className="pt-2 border-t border-slate-300 flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs text-right">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold">€{invoiceSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>VAT ({vatRate}%):</span>
                      <span className="font-mono font-bold">€{invoiceVatAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-1.5">
                      <span>Total Due:</span>
                      <span className="font-mono text-emerald-800">€{invoiceTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-700">Payment Terms &amp; Settlement Instructions:</p>
                  <p className="font-mono text-[10px] leading-relaxed">{invoiceNotes}</p>
                </div>
              </div>
            ) : (
              /* --- CONTRACT EXTENSION ADDENDUM --- */
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Addendum to Residential Lease Agreement</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    This document formally extends the residential lease term executed between <strong>Seven Rocks Hospitality</strong> (&quot;Landlord&quot;) and <strong>{selectedTenant?.name}</strong> (&quot;Resident&quot;) for the premises referenced above.
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
                      <td className="p-2.5 text-slate-800">Room {selectedTenant?.roomNumber} ({selectedTenant?.building})</td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] space-y-1">
                  <p className="font-bold text-slate-700">Special Covenants &amp; Declarations:</p>
                  <p className="text-slate-600 text-[10px] leading-relaxed">{extensionNotes}</p>
                </div>
              </div>
            )}

            {/* Signatures Footer */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-[10px]">
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider mb-8">AUTHORIZED LANDLORD SIGNATURE</p>
                <div className="border-t border-slate-400 pt-1 flex justify-between">
                  <span className="font-serif italic font-bold text-slate-800">Seven Rocks Operations</span>
                  <span className="text-slate-400 font-mono">{issueDate}</span>
                </div>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase tracking-wider mb-8">RESIDENT ACKNOWLEDGEMENT</p>
                <div className="border-t border-slate-400 pt-1 flex justify-between">
                  <span className="font-bold text-slate-800">{selectedTenant?.name}</span>
                  <span className="text-slate-400 font-mono">{issueDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Upload Template Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center space-x-2 border-b border-brand-border pb-3">
              <Upload className="h-5 w-5 text-brand-primary" />
              <h4 className="font-bold text-brand-dark text-sm font-serif">Upload Approved Template</h4>
            </div>

            <form onSubmit={handleUploadTemplate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Template Document Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Seven_Rocks_Custom_Invoice_v3.docx"
                  value={uploadedFileName}
                  onChange={(e) => setUploadedFileName(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-xl p-2.5 font-medium text-brand-dark focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Template Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full bg-brand-surface border border-brand-border rounded-xl p-2.5 font-medium text-brand-dark focus:outline-none"
                >
                  <option value="invoice">Invoice Template</option>
                  <option value="extension">Contract Extension Template</option>
                </select>
              </div>

              <div className="p-3 bg-brand-surface rounded-xl border border-dashed border-brand-border text-center text-xs text-brand-stone">
                Approved template files are validated against corporate formatting standards and registered for staff-wide generation.
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-brand-secondary hover:text-brand-dark font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white font-bold rounded-xl hover:bg-[#4E4E37] cursor-pointer shadow-brand"
                >
                  Register Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
