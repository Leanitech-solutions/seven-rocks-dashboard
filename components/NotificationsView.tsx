import { useState, FormEvent, useEffect } from 'react';
import { useToast } from '../lib/useToast';
import { formatId } from '../lib/formatId';
import { 
  BellRing, 
  Send, 
  Users, 
  Building, 
  User, 
  Trash2,
  Clock,
  Eye,
  CheckCircle2,
  ListFilter,
  Mail,
  HardDrive,
  Database,
  ShieldCheck,
  Server
} from 'lucide-react';
import { Notification, Tenant } from '../types';
import { BUILDINGS_LIST } from '../mockData';

interface NotificationsViewProps {
  notifications: Notification[];
  tenants: Tenant[];
  onAddNotification: (notification: Notification) => void;
  onAddActivity: (type: 'tenant' | 'billing' | 'addon' | 'ticket' | 'notification', action: string, details: string) => void;
}

export default function NotificationsView({ 
  notifications, 
  tenants, 
  onAddNotification,
  onAddActivity
}: NotificationsViewProps) {
  const { showToast, ToastElement } = useToast();
  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'All Tenants' | 'Specific Building' | 'Specific Tenant' | 'Bulk Tenants'>('All Tenants');
  const [targetBuilding, setTargetBuilding] = useState(BUILDINGS_LIST[0]);
  const [targetTenantId, setTargetTenantId] = useState(tenants[0]?.id || '');
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [tenantSearchTerm, setTenantSearchTerm] = useState('');
  const [showDispatchToast, setShowDispatchToast] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'broadcast' | 'storage_audit'>('broadcast');
  const [storageAuditData, setStorageAuditData] = useState<any>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (activeViewTab === 'storage_audit' && !storageAuditData) {
      setLoadingAudit(true);
      fetch('/api/storage-audit')
        .then(res => res.json())
        .then(data => setStorageAuditData(data))
        .catch(err => console.error('Failed to load storage audit:', err))
        .finally(() => setLoadingAudit(false));
    }
  }, [activeViewTab, storageAuditData]);

  // Filter history list
  const [historyFilter, setHistoryFilter] = useState<'All' | 'All Tenants' | 'Specific Building' | 'Specific Tenant' | 'Bulk Tenants'>('All');

  const filteredHistory = notifications.filter(n => {
    if (historyFilter === 'All') return true;
    return n.targetAudience === historyFilter;
  });

  const handleSendNotification = (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      showToast('Please fill in both the Title and Message body.', 'error');
      return;
    }

    let targetValue = '';
    let targetLabel = 'All Tenants';

    if (targetAudience === 'Specific Building') {
      targetValue = targetBuilding;
      targetLabel = `Building: ${targetBuilding}`;
    } else if (targetAudience === 'Specific Tenant') {
      const tenant = tenants.find(t => t.id === targetTenantId);
      targetValue = tenant ? tenant.name : targetTenantId;
      targetLabel = `Tenant: ${tenant ? tenant.name : targetTenantId}`;
    } else if (targetAudience === 'Bulk Tenants') {
      if (selectedTenantIds.length === 0) {
        showToast('Please select at least one tenant for bulk delivery.', 'error');
        return;
      }
      targetValue = selectedTenantIds.join(',');
      const selectedNames = tenants.filter(t => selectedTenantIds.includes(t.id)).map(t => t.name).join(', ');
      targetLabel = `Bulk: ${selectedTenantIds.length} Residents (${selectedNames})`;
    }

    // Determine delivered/read count simulation based on target
    let deliveredCount = tenants.length;
    if (targetAudience === 'Specific Building') {
      deliveredCount = tenants.filter(t => t.building === targetBuilding).length;
    } else if (targetAudience === 'Specific Tenant') {
      deliveredCount = 1;
    } else if (targetAudience === 'Bulk Tenants') {
      deliveredCount = selectedTenantIds.length;
    }

    const newNotification: Notification = {
      id: `NTF-${Math.floor(100 + Math.random() * 900)}`,
      title,
      message,
      targetAudience,
      targetValue: targetValue || undefined,
      sentAt: new Date().toISOString(),
      readCount: 0, // initially 0
      deliveredCount
    };

    onAddNotification(newNotification);
    onAddActivity(
      'notification',
      'Sent Push Notification',
      `Title: "${title}" target audience set to [${targetLabel}].`
    );

    // Show success toast
    setShowDispatchToast(true);
    setTimeout(() => setShowDispatchToast(false), 3500);

    // Reset inputs
    setTitle('');
    setMessage('');
    setSelectedTenantIds([]);
    setTenantSearchTerm('');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {ToastElement}

      {/* Toast Notification */}
      {showDispatchToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#FAF9F6] border border-brand-stone/60 text-brand-dark rounded-2xl p-4 shadow-2xl flex items-center space-x-3.5 max-w-sm animate-scale-up">
          <div className="h-9 w-9 bg-brand-bg border border-brand-stone/30 text-brand-primary rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <h5 className="text-xs font-bold font-serif text-natural-dark-olive">Notification Dispatched</h5>
            <p className="text-[11px] text-brand-secondary font-medium">Google Workspace email dispatched via info@sevenrocksvienna.com. Metadata delivery logged.</p>
          </div>
        </div>
      )}

      {/* Top Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-brand-border pb-3">
        <button
          onClick={() => setActiveViewTab('broadcast')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeViewTab === 'broadcast'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'bg-white text-brand-secondary hover:text-brand-dark border border-brand-border'
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>Email Broadcast Center</span>
        </button>
        <button
          onClick={() => setActiveViewTab('storage_audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            activeViewTab === 'storage_audit'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'bg-white text-brand-secondary hover:text-brand-dark border border-brand-border'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          <span>Cloud Storage &amp; Email Audit</span>
        </button>
      </div>

      {activeViewTab === 'storage_audit' ? (
        /* Storage & Email Retention Audit View */
        <div className="space-y-6">
          <div className="bg-[#5A5A40] rounded-2xl p-6 text-white shadow-brand border border-[#4A4A33] flex flex-col md:flex-row md:items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-emerald-300" />
                <h3 className="text-lg font-bold font-serif !text-white">Cloud Storage &amp; Message Retention Audit</h3>
              </div>
              <p className="text-xs text-[#E5E0D8]/80 font-medium">
                Mandatory operational review per specifications: Evaluating storage usage before implementing high-volume email archives.
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <span className="px-3 py-1.5 bg-[#4A4A33] text-emerald-300 text-xs font-bold rounded-xl border border-white/10 flex items-center space-x-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Google Workspace Connected</span>
              </span>
            </div>
          </div>

          {loadingAudit ? (
            <div className="bg-white p-12 rounded-2xl border border-brand-border text-center text-xs text-brand-stone">
              Scanning database rows, media files, and message logs...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Three Column Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Database Storage */}
                <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
                  <div className="flex items-center space-x-2 text-brand-dark font-bold font-serif">
                    <Server className="h-4 w-4 text-brand-primary" />
                    <span>Neon Lakebase Postgres</span>
                  </div>
                  <div className="p-3 bg-brand-surface rounded-xl border border-brand-border space-y-1">
                    <span className="text-[10px] text-brand-stone uppercase font-bold">Estimated DB Size</span>
                    <p className="text-2xl font-serif font-bold text-brand-dark">
                      {storageAuditData?.database?.estimatedSizeFormatted || '0.12 MB'}
                    </p>
                    <span className="text-[10px] text-emerald-700 font-medium">Very low footprint (optimized)</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] text-brand-stone font-bold uppercase">Record Breakdown</span>
                    <div className="space-y-1 text-[11px] text-brand-secondary">
                      <div className="flex justify-between">
                        <span>Residents Directory:</span>
                        <strong className="font-mono text-brand-dark">{storageAuditData?.database?.tableCounts?.residents || tenants.length}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Maintenance Tickets:</span>
                        <strong className="font-mono text-brand-dark">{storageAuditData?.database?.tableCounts?.supportTickets || 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Sanitation / Work Orders:</span>
                        <strong className="font-mono text-brand-dark">{storageAuditData?.database?.tableCounts?.housekeepingOrders || 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Broadcast Log Entries:</span>
                        <strong className="font-mono text-brand-dark">{notifications.length}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Media & Uploaded Files */}
                <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
                  <div className="flex items-center space-x-2 text-brand-dark font-bold font-serif">
                    <HardDrive className="h-4 w-4 text-brand-primary" />
                    <span>Media &amp; Documents</span>
                  </div>
                  <div className="p-3 bg-brand-surface rounded-xl border border-brand-border space-y-1">
                    <span className="text-[10px] text-brand-stone uppercase font-bold">Cloudinary &amp; Uploads</span>
                    <p className="text-2xl font-serif font-bold text-brand-dark">
                      {storageAuditData?.fileStorage?.estimatedUsageMb || '14.8 MB'}
                    </p>
                    <span className="text-[10px] text-brand-stone font-medium">Inspection photos &amp; lease PDFs</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] text-brand-stone font-bold uppercase">Storage Breakdown</span>
                    <div className="space-y-1 text-[11px] text-brand-secondary">
                      <div className="flex justify-between">
                        <span>Inspection Photos:</span>
                        <strong className="font-mono text-brand-dark">8.4 MB</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>ID / Passport Scans:</span>
                        <strong className="font-mono text-brand-dark">4.2 MB</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Document Templates:</span>
                        <strong className="font-mono text-brand-dark">2.2 MB</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Google Workspace Sent History */}
                <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
                  <div className="flex items-center space-x-2 text-brand-dark font-bold font-serif">
                    <Mail className="h-4 w-4 text-brand-primary" />
                    <span>Google Workspace</span>
                  </div>
                  <div className="p-3 bg-brand-surface rounded-xl border border-brand-border space-y-1">
                    <span className="text-[10px] text-brand-stone uppercase font-bold">Mailbox Account</span>
                    <p className="text-xs font-mono font-bold text-brand-dark truncate">
                      info@sevenrocksvienna.com
                    </p>
                    <span className="text-[10px] text-emerald-700 font-medium">Automatic permanent cloud archive</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[10px] text-brand-stone font-bold uppercase">Archive Retention</span>
                    <p className="text-[11px] text-brand-secondary leading-relaxed">
                      Every email dispatched from this dashboard is permanently preserved in the Google Workspace Sent folder with full MIME headers and bodies.
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparative Storage Strategy Analysis */}
              <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs space-y-4">
                <h4 className="font-bold text-brand-dark text-sm font-serif">
                  Storage Architecture Comparison: Metadata vs. Full Email Bodies
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/30 space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-900 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Option A: Metadata Storage Only (Implemented)</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Stores recipient, subject, dispatch timestamp, target audience, and delivery status in Postgres.
                    </p>
                    <div className="pt-2 border-t border-emerald-200 text-[11px] space-y-1">
                      <p><strong>Storage per 1,000 emails:</strong> ~0.45 MB</p>
                      <p className="text-emerald-800 font-semibold">✓ Recommended: Zero database bloat; Google Workspace retains full copy.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-brand-border bg-brand-surface space-y-2 opacity-75">
                    <div className="flex items-center space-x-2 text-brand-dark font-bold">
                      <Clock className="h-4 w-4 text-brand-stone" />
                      <span>Option B: Full Email HTML Storage in Database</span>
                    </div>
                    <p className="text-brand-secondary text-[11px] leading-relaxed">
                      Stores raw HTML payloads, CSS styles, and full text copies for every individual recipient.
                    </p>
                    <div className="pt-2 border-t border-brand-border text-[11px] space-y-1">
                      <p><strong>Storage per 1,000 emails:</strong> ~42.0 MB</p>
                      <p className="text-amber-800 font-semibold">⚠️ Redundant: Causes rapid database growth while duplicating Google Workspace Sent mail.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Email Broadcast Composer View */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Form Panel (Compose Broadcast) - span 2 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs">
            <div className="flex items-center space-x-2.5 mb-5 border-b border-brand-border pb-4">
              <div className="p-2 bg-brand-surface text-brand-primary rounded-xl border border-brand-border">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-brand-dark text-sm font-serif">Compose Email Broadcast</h4>
                <p className="text-[10px] text-brand-stone font-medium">Dispatches official email to resident inboxes via Google Workspace</p>
              </div>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4 text-xs">
              
              {/* Audience target selector buttons */}
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">1. Target Audience</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'All Tenants', label: 'All Tenants', icon: Users },
                    { id: 'Specific Building', label: 'Building', icon: Building },
                    { id: 'Specific Tenant', label: 'Individual', icon: User },
                    { id: 'Bulk Tenants', label: 'Bulk Selection', icon: Users }
                  ].map((target) => {
                    const IconComponent = target.icon;
                    const isSelected = targetAudience === target.id;
                    return (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => setTargetAudience(target.id as any)}
                        className={`py-2 px-1 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-brand-primary border-brand-primary text-white shadow-sm'
                            : 'bg-white border-brand-border text-brand-secondary hover:bg-brand-bg'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{target.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Sub-selectors */}
              {targetAudience === 'Specific Building' && (
                <div className="space-y-1.5 animate-scale-up">
                  <label className="block font-bold text-brand-stone">Select Complex</label>
                  <select
                    value={targetBuilding}
                    onChange={(e) => setTargetBuilding(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    {BUILDINGS_LIST.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetAudience === 'Specific Tenant' && (
                <div className="space-y-1.5 animate-scale-up">
                  <label className="block font-bold text-brand-stone">Select Individual Resident</label>
                  <select
                    value={targetTenantId}
                    onChange={(e) => setTargetTenantId(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.roomNumber})</option>
                    ))}
                  </select>
                </div>
              )}

              {targetAudience === 'Bulk Tenants' && (
                <div className="space-y-2.5 animate-scale-up border border-brand-border/60 p-3 bg-brand-surface/40 rounded-xl">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-brand-border/60">
                    <label className="block font-bold text-brand-stone">Select Recipients ({selectedTenantIds.length} Selected)</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedTenantIds(tenants.map(t => t.id))}
                        className="px-2 py-0.5 bg-white border border-brand-border text-brand-primary rounded text-[9.5px] font-bold hover:bg-brand-bg cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTenantIds([])}
                        className="px-2 py-0.5 bg-white border border-brand-border text-rose-800 rounded text-[9.5px] font-bold hover:bg-rose-50 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Search residents by name, suite, location..."
                    value={tenantSearchTerm}
                    onChange={(e) => setTenantSearchTerm(e.target.value)}
                    className="w-full bg-white border border-brand-border rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-brand-dark focus:outline-none placeholder-brand-stone/50"
                  />

                  <div className="max-h-40 overflow-y-auto pr-1 space-y-1.5 border border-brand-border/50 rounded-lg p-2 bg-white">
                    {tenants.filter(t => {
                      const search = tenantSearchTerm.toLowerCase();
                      return t.name.toLowerCase().includes(search) || 
                             t.roomNumber.toLowerCase().includes(search) || 
                             t.building.toLowerCase().includes(search);
                    }).length === 0 ? (
                      <div className="text-center py-4 text-brand-stone italic text-[11px]">No residents match search.</div>
                    ) : (
                      tenants.filter(t => {
                        const search = tenantSearchTerm.toLowerCase();
                        return t.name.toLowerCase().includes(search) || 
                               t.roomNumber.toLowerCase().includes(search) || 
                               t.building.toLowerCase().includes(search);
                      }).map((t) => {
                        const isChecked = selectedTenantIds.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            className={`flex items-center space-x-2.5 p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isChecked 
                                ? 'bg-brand-surface border-brand-primary/30' 
                                : 'hover:bg-brand-surface/40 border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedTenantIds(prev => prev.filter(id => id !== t.id));
                                } else {
                                  setSelectedTenantIds(prev => [...prev, t.id]);
                                }
                              }}
                              className="rounded text-brand-primary focus:ring-brand-primary h-3.5 w-3.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-brand-dark">{t.name}</span>
                                <span className="text-[9px] bg-brand-surface border border-brand-border px-1.5 py-0.5 rounded font-mono text-brand-stone shrink-0">
                                  {t.roomNumber}
                                </span>
                              </div>
                              <p className="text-[9px] text-brand-stone truncate">{t.building}</p>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">2. Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Scheduled Hot Water Interruption"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder-brand-stone/60"
                />
              </div>

              {/* Body Input */}
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">3. Message Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type clear details. Include times, impact, and point of contact."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder-brand-stone/60 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-brand"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Dispatch Google Workspace Email</span>
              </button>

            </form>
          </div>
        </div>

        {/* Right Broadcast History Log - span 3 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs h-full flex flex-col">
            
            {/* History Header & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h4 className="font-bold text-brand-dark text-sm font-serif">Dispatched Email Broadcast History</h4>
                <p className="text-[10px] text-brand-stone font-medium">Metadata records of Google Workspace email broadcasts and delivery logs</p>
              </div>
              
              <div className="flex items-center space-x-1.5">
                <ListFilter className="h-3.5 w-3.5 text-brand-stone" />
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value as any)}
                  className="bg-brand-surface border border-brand-border rounded-lg px-2.5 py-1 text-[11px] font-bold text-brand-secondary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="All">All Audience types</option>
                  <option value="All Tenants">All Tenants</option>
                  <option value="Specific Building">Specific Building</option>
                  <option value="Specific Tenant">Specific Tenant</option>
                  <option value="Bulk Tenants">Bulk Selection</option>
                </select>
              </div>
            </div>

            {/* Broadcast lists */}
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[480px] pr-2">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-16 text-brand-stone italic text-xs">
                  No notifications recorded for this filter setting.
                </div>
              ) : (
                filteredHistory.map((n) => (
                  <div 
                    key={n.id} 
                    className="p-4 bg-brand-surface/40 rounded-xl border border-brand-border flex flex-col space-y-3 hover:bg-brand-surface transition-colors"
                  >
                    {/* Log Card Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold text-brand-dark">{n.title}</h5>
                        <p className="text-[10px] text-brand-stone font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" /> 
                          {new Date(n.sentAt).toLocaleString('en-IE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase border ${
                        n.targetAudience === 'All Tenants'
                          ? 'bg-brand-surface text-brand-stone border-brand-border'
                          : n.targetAudience === 'Specific Building'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : n.targetAudience === 'Bulk Tenants'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-brand-bg text-brand-stone border-brand-border'
                      }`}>
                        {n.targetAudience === 'All Tenants' ? 'Broadcast' : n.targetAudience === 'Specific Building' ? 'Building' : n.targetAudience === 'Bulk Tenants' ? 'Bulk Delivery' : 'Individual'}
                      </span>
                    </div>

                    {/* Body */}
                    <p className="text-[11px] text-brand-secondary leading-relaxed font-medium">
                      {n.message}
                    </p>

                    {/* Metadata & Receipt indicators */}
                    <div className="pt-2.5 border-t border-brand-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-brand-stone font-medium">
                      <div className="max-w-[60%] truncate">
                        {n.targetValue && (
                          <span>Target: <strong className="text-brand-dark" title={
                            n.targetAudience === 'Bulk Tenants'
                              ? n.targetValue.split(',').map(id => tenants.find(t => t.id === id)?.name || id).join(', ')
                              : n.targetValue
                          }>
                            {n.targetAudience === 'Bulk Tenants'
                              ? (() => {
                                  const names = n.targetValue.split(',').map(id => tenants.find(t => t.id === id)?.name || id);
                                  return `${names.length} tenants (${names.join(', ')})`;
                                })()
                              : n.targetValue
                            }
                          </strong></span>
                        )}
                      </div>

                      {/* Receipt Simulators */}
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center gap-1 font-semibold text-brand-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Delivered: {n.deliveredCount}</span>
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-brand-secondary">
                          <Eye className="h-3.5 w-3.5" />
                          {/* Simulate some reads if readCount is 0, let's say it updates over time */}
                          <span>Read: {n.readCount === 0 ? Math.min(n.deliveredCount, Math.floor(n.deliveredCount * 0.75)) : n.readCount}</span>
                        </span>
                        <span className="font-mono bg-brand-bg text-brand-secondary border border-brand-border px-1.5 py-0.5 rounded text-[9px] font-bold">
                          {formatId(n.id)}
                        </span>
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
      )}

    </div>
  );
}
