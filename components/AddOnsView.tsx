import { useState, FormEvent } from 'react';
import { useToast } from '../lib/useToast';
import { useDialog } from '../lib/useDialog';
import { 
  Sparkles, 
  Dumbbell, 
  CookingPot, 
  WashingMachine, 
  Compass, 
  Check, 
  X, 
  Clock, 
  Coins, 
  Inbox, 
  ChevronRight,
  ShieldAlert,
  ShoppingBag,
  Plus,
  Trash2,
  Download
} from 'lucide-react';
import { AddOnRequest, Tenant, AddOnService } from '../types';

interface AddOnsViewProps {
  addOnRequests: AddOnRequest[];
  tenants: Tenant[];
  catalogItems?: AddOnService[];
  onAddCatalogItem?: (newItem: AddOnService) => void;
  onEditCatalogItem?: (updatedItem: AddOnService) => Promise<void> | void;
  onDeleteCatalogItem?: (id: string) => void;
  onUpdateRequest?: (updatedRequest: AddOnRequest) => void;
  onUpdateAddOnRequest?: (updatedRequest: AddOnRequest) => Promise<void> | void;
  onUpdateTenant: (updatedTenant: Tenant) => void;
  onAddActivity: (type: 'tenant' | 'billing' | 'addon' | 'ticket' | 'notification', action: string, details: string) => void;
}

const ICON_MAP = {
  Dumbbell,
  Sparkles,
  CookingPot,
  WashingMachine,
  Compass,
  ShoppingBag
};

export default function AddOnsView({ 
  addOnRequests, 
  tenants, 
  catalogItems = [],
  onAddCatalogItem,
  onEditCatalogItem,
  onDeleteCatalogItem,
  onUpdateRequest, 
  onUpdateAddOnRequest,
  onUpdateTenant,
  onAddActivity
}: AddOnsViewProps) {
  // Helper that persists to backend if available, else falls back to local state update
  const updateRequest = async (req: AddOnRequest) => {
    if (onUpdateAddOnRequest) {
      await onUpdateAddOnRequest(req);
    } else if (onUpdateRequest) {
      onUpdateRequest(req);
    }
  };
  const { showToast, ToastElement } = useToast();
  const { confirmDialog, DialogElement } = useDialog();
  const [activeCatalogTab, setActiveCatalogTab] = useState<'all' | 'fitness' | 'kits' | 'utilities' | 'other'>('all');
  const [requestsFilter, setRequestsFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');

  // Add Service Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'fitness' | 'kits' | 'utilities' | 'other'>('other');
  const [newIconName, setNewIconName] = useState<'Dumbbell' | 'Sparkles' | 'CookingPot' | 'WashingMachine' | 'Compass' | 'ShoppingBag'>('Compass');
  const [newPrice, setNewPrice] = useState('');
  const [newPriceVal, setNewPriceVal] = useState<number>(0);
  const [newDesc, setNewDesc] = useState('');
  const [newOptionsStr, setNewOptionsStr] = useState('');
  const [newBadge, setNewBadge] = useState('');

  // Edit Service Form states
  const [editingItem, setEditingItem] = useState<AddOnService | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'fitness' | 'kits' | 'utilities' | 'other'>('other');
  const [editIconName, setEditIconName] = useState<'Dumbbell' | 'Sparkles' | 'CookingPot' | 'WashingMachine' | 'Compass' | 'ShoppingBag'>('Compass');
  const [editPrice, setEditPrice] = useState('');
  const [editPriceVal, setEditPriceVal] = useState<number>(0);
  const [editDesc, setEditDesc] = useState('');
  const [editOptionsStr, setEditOptionsStr] = useState('');
  const [editBadge, setEditBadge] = useState('');

  const openEditModal = (item: AddOnService) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditIconName(item.iconName);
    setEditPrice(item.price);
    setEditPriceVal(item.priceVal);
    setEditDesc(item.desc);
    setEditOptionsStr(item.options?.join(', ') || '');
    setEditBadge(item.badge || '');
  };

  const handleEditService = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim() || !editPrice.trim()) {
      showToast('Please fill out Name and Standard Rate.', 'error');
      return;
    }
    const options = editOptionsStr
      ? editOptionsStr.split(',').map(s => s.trim()).filter(Boolean)
      : [editPrice];
    const updated: AddOnService = {
      ...editingItem,
      name: editName,
      category: editCategory,
      iconName: editIconName,
      price: editPrice,
      priceVal: editPriceVal || parseFloat(editPrice.replace(/[^0-9.]/g, '')) || 0,
      desc: editDesc,
      options,
      badge: editBadge.trim() || undefined,
    };
    if (onEditCatalogItem) await onEditCatalogItem(updated);
    setEditingItem(null);
    showToast(`"${editName}" updated successfully.`, 'success');
  };

  const handleCreateService = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice.trim()) {
      showToast('Please fill out Name and Standard Rate.', 'error');
      return;
    }

    const options = newOptionsStr
      ? newOptionsStr.split(',').map(s => s.trim()).filter(Boolean)
      : [newPrice];

    const newService: AddOnService = {
      id: `cat-custom-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newName,
      category: newCategory,
      price: newPrice,
      priceVal: newPriceVal || parseFloat(newPrice.replace(/[^0-9.]/g, '')) || 0,
      desc: newDesc || `${newName} premium co-living service.`,
      options,
      iconName: newIconName,
      badge: newBadge.trim() || undefined
    };

    if (onAddCatalogItem) {
      onAddCatalogItem(newService);
    }

    // Reset fields
    setNewName('');
    setNewCategory('other');
    setNewIconName('Compass');
    setNewPrice('');
    setNewPriceVal(0);
    setNewDesc('');
    setNewOptionsStr('');
    setNewBadge('');
    setShowAddForm(false);
  };

  // Use only DB-backed catalog items (no hardcoded fallback)
  const CATALOG_ITEMS = catalogItems;




  const filteredCatalog = CATALOG_ITEMS.filter(item => {
    if (activeCatalogTab === 'all') return true;
    return item.category === activeCatalogTab;
  });

  const filteredRequests = addOnRequests.filter(req => {
    if (requestsFilter === 'All') return true;
    return req.status === requestsFilter;
  });

  const handleDownloadCSV = () => {
    const headers = [
      'ID',
      'Resident Name',
      'Room/Suite',
      'Building/Location',
      'Service Requested',
      'Category',
      'Requested Date',
      'Price Details',
      'Price Value (€)',
      'Status',
      'Payment Method',
      'Payment Status',
      'Payment Channel',
      'Payment Gateway/Terminal',
      'Payment Date'
    ];

    const rows = filteredRequests.map(req => [
      req.id,
      req.tenantName,
      req.roomNumber,
      req.building || '',
      req.serviceName,
      req.category,
      req.requestDate,
      req.priceDetails,
      req.priceValue,
      req.status,
      req.paymentOption || 'Request Invoice (Pay at Desk)',
      req.paymentStatus || 'Unpaid',
      req.paymentChannel || '',
      req.paymentMethod || '',
      req.paymentDate || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => {
        const strVal = val === undefined || val === null ? '' : String(val);
        const escaped = strVal.replace(/"/g, '""');
        return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `addon_services_requests_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddActivity(
      'addon',
      'Exported Add-on Requests',
      `Admin exported ${filteredRequests.length} add-on service requests to a CSV spreadsheet.`
    );
  };

  // Action: Approve Add-on Request
  const handleApprove = async (req: AddOnRequest) => {
    const updatedRequest: AddOnRequest = { ...req, status: 'Approved' };
    await updateRequest(updatedRequest);

    // Add subscription string to tenant's active list
    const tenant = tenants.find(t => t.id === req.tenantId);
    if (tenant) {
      const formatStr = `${req.serviceName} (${req.priceDetails})`;
      if (!tenant.activeAddOns.includes(formatStr)) {
        onUpdateTenant({ ...tenant, activeAddOns: [...tenant.activeAddOns, formatStr] });
      }
    }

    showToast(`Approved "${req.serviceName}" for ${req.tenantName}.`, 'success');
    onAddActivity('addon', 'Approved Add-on Subscription', `Approved service "${req.serviceName}" for ${req.tenantName} (${req.roomNumber}).`);
  };

  // Action: Reject Add-on Request
  const handleReject = async (req: AddOnRequest) => {
    const updatedRequest: AddOnRequest = { ...req, status: 'Rejected' };
    await updateRequest(updatedRequest);

    showToast(`Declined "${req.serviceName}" request.`, 'info');
    onAddActivity('addon', 'Declined Add-on Request', `Declined "${req.serviceName}" request for ${req.tenantName}.`);
  };

  // Action: Mark Service Paid manually
  const handleMarkServicePaid = async (req: AddOnRequest) => {
    const confirmed = await confirmDialog(
      'Confirm Payment',
      `Are you sure you want to mark this service request as PAID? This will update the status and record the transaction.`
    );
    if (!confirmed) return;

    const updatedRequest: AddOnRequest = {
      ...req,
      paymentStatus: 'Paid',
      paymentChannel: 'Desk',
      paymentMethod: 'Desk Terminal / Invoiced',
      paymentDate: new Date().toISOString().split('T')[0]
    };
    await updateRequest(updatedRequest);

    showToast(`Payment recorded for "${req.serviceName}".`, 'success');
    onAddActivity('addon', 'Logged Service Payment', `Add-on service request ${req.id} marked as PAID at desk. Total collected: €${req.priceValue}.`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {ToastElement}
      <DialogElement />
      
      {/* Top Section: Split Requests Queue & Catalog info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Requests Queue - span 2 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs flex flex-col h-full">
            
            {/* Header / Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h4 className="font-bold text-brand-dark text-sm font-serif">Incoming Services Request Queue</h4>
                <p className="text-[10px] text-brand-stone font-medium">Review, approve, or reject customized resident add-on choices</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={handleDownloadCSV}
                  className="px-3 py-1.5 bg-brand-surface hover:bg-[#E5E0D8] text-brand-primary border border-brand-border rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                  title="Download requests in CSV format"
                >
                  <Download className="h-3.5 w-3.5 text-natural-orange" />
                  <span>Export CSV</span>
                </button>

                <div className="flex space-x-1 border border-brand-border bg-brand-surface p-1 rounded-xl">
                  {['Pending', 'Approved', 'Rejected', 'All'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRequestsFilter(tab as any)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        requestsFilter === tab
                          ? 'bg-brand-primary text-white border border-brand-primary'
                          : 'text-brand-secondary hover:text-brand-primary'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[400px] pr-2">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-20 bg-brand-surface border-2 border-dashed border-brand-border rounded-xl text-brand-stone text-xs flex flex-col items-center justify-center space-y-2">
                  <Inbox className="h-6 w-6 text-brand-stone" />
                  <span>No {requestsFilter.toLowerCase()} service requests awaiting review.</span>
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className="p-4 bg-brand-surface/40 hover:bg-brand-surface rounded-xl border border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-[10px] font-bold text-brand-stone font-mono">{req.id}</span>
                        <span className="text-xs font-extrabold text-brand-dark truncate">{req.serviceName}</span>
                        <span className="inline-flex items-center px-2 py-0.5 bg-brand-bg text-brand-secondary text-[9px] font-bold border border-brand-border rounded">
                          {req.category}
                        </span>
                      </div>
                      <p className="text-xs text-brand-secondary font-medium">
                        Resident: <strong className="text-brand-dark font-semibold">{req.tenantName}</strong> ({req.roomNumber})
                      </p>
                      <div className="flex items-center space-x-3.5 text-[10px] text-brand-stone font-medium flex-wrap gap-y-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Requested {new Date(req.requestDate).toLocaleDateString('en-IE', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1 text-brand-primary font-semibold">
                          <Coins className="h-3 w-3" />
                          Rate: {req.priceDetails}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold border ${
                          req.paymentOption === 'Pay at Desk'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          Method: {req.paymentOption || 'Request Invoice (Pay at Desk)'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center space-x-2.5">
                      {req.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => handleReject(req)}
                            className="p-2 bg-white hover:bg-rose-50 border border-brand-border text-rose-700 rounded-lg transition-colors cursor-pointer"
                            title="Decline request"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleApprove(req)}
                            className="px-3.5 py-2 bg-brand-primary hover:bg-[#4E4E37] text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve Subscription</span>
                          </button>
                        </>
                      ) : req.status === 'Approved' ? (
                        <div className="flex flex-col items-end space-y-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-surface text-brand-primary border border-brand-border gap-1">
                            <Check className="h-3 w-3" />
                            <span>Approved</span>
                          </span>
                          {req.paymentStatus === 'Paid' ? (
                            <span className="text-[9px] text-emerald-800 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                              Paid {req.paymentChannel} ({req.paymentMethod})
                            </span>
                          ) : (
                            <div className="flex items-center space-x-1 pt-0.5">
                              <button
                                onClick={() => handleMarkServicePaid(req)}
                                className="px-2 py-0.5 bg-brand-surface hover:bg-[#E5E0D8] border border-brand-border text-brand-primary rounded text-[9.5px] font-bold cursor-pointer"
                              >
                                Mark Paid at Desk
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold gap-1 bg-rose-50 text-rose-800 border border-rose-200">
                          <X className="h-3.5 w-3.5" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

        {/* Informational Policy sidebar */}
        <div className="lg:col-span-1 relative">
          {/* Solid shadow layer as a background */}
          <div className="absolute inset-0 bg-brand-primary/10 rounded-2xl translate-x-1.5 translate-y-1.5"></div>
          
          <div className="relative bg-brand-surface text-brand-dark rounded-2xl p-6 border border-brand-stone/60 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-brand-primary">
                <ShoppingBag className="h-5 w-5 text-brand-primary" />
                <h4 className="font-bold text-natural-dark-olive text-sm font-serif">Services Billing Rules</h4>
              </div>
              <p className="text-xs text-brand-secondary leading-relaxed font-medium">
                When you approve services, Seven Rocks automatically appends the charges to the next generated monthly invoice.
              </p>
              
              <div className="divide-y divide-brand-border text-[11px] leading-relaxed">
                <div className="py-2.5 space-y-1">
                  <span className="text-brand-dark font-bold block font-serif">Fitness & Wellness Passes</span>
                  <p className="text-brand-stone font-medium">
                    Combo pass rates is billed monthly recurring until cancellation is requested.
                  </p>
                </div>
                <div className="py-2.5 space-y-1">
                  <span className="text-brand-dark font-bold block font-serif">Kitchen Kits</span>
                  <p className="text-brand-stone font-medium">
                    Billed as monthly lease charges (€28 or €68). Verify kit delivery signature manually.
                  </p>
                </div>
                <div className="py-2.5 space-y-1">
                  <span className="text-brand-dark font-bold block font-serif">One-time Requests</span>
                  <p className="text-brand-stone font-medium">
                    E.g. Airport Transfers are appended as single itemized chargers with standard 10% VAT.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-brand-bg p-3 rounded-xl border border-brand-border flex items-center gap-2 text-[10px] text-brand-secondary mt-6 font-semibold">
              <ShieldAlert className="h-4 w-4 text-brand-primary shrink-0" />
              <span>Approved items instantly populate tenant profiles.</span>
            </div>
          </div>
        </div>

      </div>

      {/* Catalog Directory Section (Pricing Tiers Display) */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border pb-4">
          <div>
            <h4 className="font-bold text-brand-dark text-sm font-serif">Seven Rocks Services & Amenity Directory</h4>
            <p className="text-[10px] text-brand-stone font-medium">Verified pricing catalog and rental tiers for in-house staff consultation</p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Add New Service</span>
            </button>

            <div className="flex flex-wrap gap-1">
              {[
                { id: 'all', label: 'All Services' },
                { id: 'fitness', label: 'Fitness & Wellness' },
                { id: 'kits', label: 'Equipment Kits' },
                { id: 'utilities', label: 'Utilities & Laundry' },
                { id: 'other', label: 'Specialty / Others' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCatalogTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeCatalogTab === tab.id
                      ? 'bg-brand-primary text-white border border-brand-primary'
                      : 'bg-brand-surface text-brand-secondary border border-brand-border hover:bg-[#E5E0D8]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleCreateService} className="bg-[#FAF9F6] border border-brand-border p-5 rounded-2xl space-y-4 text-xs animate-scale-up">
            <div className="flex justify-between items-center border-b border-brand-border pb-2">
              <h5 className="font-bold text-brand-dark font-serif text-xs">Add New Amenity / Service Catalog Item</h5>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-brand-stone hover:text-brand-dark cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Bike Rental"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white border border-brand-border rounded-lg p-2 font-medium text-brand-dark focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Category *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-white border border-brand-border rounded-lg p-2 font-semibold text-brand-dark focus:outline-none"
                >
                  <option value="fitness">Fitness & Wellness</option>
                  <option value="kits">Equipment Kits</option>
                  <option value="utilities">Utilities & Laundry</option>
                  <option value="other">Specialty / Others</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Icon *</label>
                <select
                  value={newIconName}
                  onChange={(e) => setNewIconName(e.target.value as any)}
                  className="w-full bg-white border border-brand-border rounded-lg p-2 font-semibold text-brand-dark focus:outline-none"
                >
                  <option value="Compass">Compass (Specialty)</option>
                  <option value="Dumbbell">Dumbbell (Fitness)</option>
                  <option value="Sparkles">Sparkles (Wellness)</option>
                  <option value="CookingPot">CookingPot (Kits)</option>
                  <option value="WashingMachine">WashingMachine (Laundry)</option>
                  <option value="ShoppingBag">ShoppingBag (Retail)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Price Rate Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. €15/Day or €45/Mo"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full bg-white border border-brand-border rounded-lg p-2 font-medium text-brand-dark focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Price Value (€) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15"
                  value={newPriceVal || ''}
                  onChange={(e) => setNewPriceVal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-brand-border rounded-lg p-2 font-medium text-brand-dark focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Badge (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. New or Popular"
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  className="w-full bg-white border border-brand-border rounded-lg p-2 font-medium text-brand-dark focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Description *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Provide a description of the service..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-white border border-brand-border rounded-lg p-2 font-medium text-brand-dark focus:outline-none leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-brand-stone">Custom Tiers / Options (Comma-separated)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. €10/Day, €30/Week, €90/Month (defaults to Rate if empty)"
                  value={newOptionsStr}
                  onChange={(e) => setNewOptionsStr(e.target.value)}
                  className="w-full bg-white border border-brand-border rounded-lg p-2 font-medium text-brand-dark focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-brand-border text-brand-secondary bg-white hover:bg-brand-surface rounded-lg font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
              >
                Save & Add to Catalog
              </button>
            </div>
          </form>
        )}

        {/* Grid cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCatalog.map((item) => {
            const IconComponent = (item as any).icon || (ICON_MAP[item.iconName as keyof typeof ICON_MAP] || Compass);
            return (
              <div 
                key={item.id} 
                className="p-4 border border-brand-border rounded-2xl bg-brand-surface/40 hover:bg-brand-surface hover:border-brand-stone transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-brand-surface text-brand-primary rounded-lg border border-brand-border">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {item.badge && (
                        <span className="text-[9px] font-extrabold bg-brand-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                      {onEditCatalogItem && (
                        <button
                          type="button"
                          title="Edit Service"
                          onClick={() => openEditModal(item)}
                          className="p-1 text-brand-secondary hover:text-brand-primary hover:bg-brand-surface rounded-lg border border-transparent hover:border-brand-border transition-colors cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                      {onDeleteCatalogItem && (
                        <button
                          type="button"
                          title="Delete Service"
                          onClick={async () => {
                            const isConfirmed = await confirmDialog("Delete Add-on", `Are you sure you want to delete "${item.name}" from the catalog?`);
                            if (isConfirmed) {
                              onDeleteCatalogItem(item.id);
                            }
                          }}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-brand-dark font-serif">{item.name}</h5>
                    <span className="text-brand-stone text-[10px] uppercase font-bold tracking-wider font-mono">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-brand-border space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-brand-stone font-medium">Standard rate:</span>
                    <strong className="text-sm font-extrabold text-brand-dark font-mono">{item.price}</strong>
                  </div>
                  
                  {item.options && item.options.length > 0 && (
                  <div className="space-y-1 text-[10px] text-brand-secondary leading-normal font-medium bg-white p-2 rounded-lg border border-brand-border">
                    <span className="font-bold text-brand-dark block font-serif">Pricing Options / Tiers:</span>
                    {item.options.map((opt: string, i: number) => (
                      <div key={i} className="flex items-center space-x-1">
                        <ChevronRight className="h-2.5 w-2.5 text-brand-primary shrink-0" />
                        <span className="truncate">{opt}</span>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state when no services have been created yet */}
        {CATALOG_ITEMS.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 bg-brand-surface rounded-2xl border border-brand-border">
              <Plus className="h-8 w-8 text-brand-stone" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-dark font-serif">No services in the catalog yet</p>
              <p className="text-[11px] text-brand-stone mt-1">Click <strong>Add New Service</strong> above to create your first add-on.</p>
            </div>
          </div>
        )}

      </div>

      {/* Edit Service Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/40 backdrop-blur-sm">
          <form
            onSubmit={handleEditService}
            className="bg-white rounded-2xl border border-brand-border p-6 w-full max-w-lg shadow-2xl space-y-4 text-xs animate-scale-up max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-brand-border pb-3">
              <h5 className="font-bold text-brand-dark font-serif text-sm">Edit Service: {editingItem.name}</h5>
              <button type="button" onClick={() => setEditingItem(null)} className="text-brand-stone hover:text-brand-dark cursor-pointer p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-brand-secondary uppercase mb-1">Service Name *</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} required
                  className="w-full border border-brand-border rounded-xl px-3 py-2 bg-brand-bg text-brand-dark text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-secondary uppercase mb-1">Category</label>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value as any)}
                  className="w-full border border-brand-border rounded-xl px-3 py-2 bg-brand-bg text-brand-dark text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary">
                  <option value="fitness">Fitness & Wellness</option>
                  <option value="kits">Equipment Kits</option>
                  <option value="utilities">Utilities</option>
                  <option value="other">Other / Specialty</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-secondary uppercase mb-1">Icon</label>
                <select value={editIconName} onChange={e => setEditIconName(e.target.value as any)}
                  className="w-full border border-brand-border rounded-xl px-3 py-2 bg-brand-bg text-brand-dark text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary">
                  <option value="Dumbbell">Dumbbell</option>
                  <option value="Sparkles">Sparkles</option>
                  <option value="CookingPot">Cooking Pot</option>
                  <option value="WashingMachine">Washing Machine</option>
                  <option value="Compass">Compass</option>
                  <option value="ShoppingBag">Shopping Bag</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-secondary uppercase mb-1">Standard Rate *</label>
                <input value={editPrice} onChange={e => setEditPrice(e.target.value)} required placeholder="e.g. €30/Mo"
                  className="w-full border border-brand-border rounded-xl px-3 py-2 bg-brand-bg text-brand-dark text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-secondary uppercase mb-1">Numeric Value (€)</label>
                <input type="number" value={editPriceVal} onChange={e => setEditPriceVal(Number(e.target.value))} min={0} step={0.01}
                  className="w-full border border-brand-border rounded-xl px-3 py-2 bg-brand-bg text-brand-dark text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-brand-secondary uppercase mb-1">Description</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                  className="w-full border border-brand-border rounded-xl px-3 py-2 bg-brand-bg text-brand-dark text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-brand-secondary uppercase mb-1">Pricing Options / Tiers (comma-separated)</label>
                <input value={editOptionsStr} onChange={e => setEditOptionsStr(e.target.value)} placeholder="e.g. €50/10 Days, €20/Mo (Annual)"
                  className="w-full border border-brand-border rounded-xl px-3 py-2 bg-brand-bg text-brand-dark text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-brand-secondary uppercase mb-1">Badge (optional)</label>
                <input value={editBadge} onChange={e => setEditBadge(e.target.value)} placeholder="e.g. Popular, Best Value, New"
                  className="w-full border border-brand-border rounded-xl px-3 py-2 bg-brand-bg text-brand-dark text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-brand-border">
              <button type="button" onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-brand-secondary hover:text-brand-dark transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit"
                className="px-5 py-2.5 bg-brand-primary hover:bg-brand-dark text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
