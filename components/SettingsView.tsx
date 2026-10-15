import { useState, FormEvent } from 'react';
import { useToast } from '../lib/useToast';
import { useDialog } from '../lib/useDialog';
import { formatId } from '../lib/formatId';
import { 
  Settings, 
  HelpCircle, 
  Save, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Edit3, 
  X,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Info
} from 'lucide-react';
import { PolicyFAQ, AppSettings } from '../types';

interface SettingsViewProps {
  policies: PolicyFAQ[];
  settings: AppSettings;
  onUpdatePolicies: (updatedPolicies: PolicyFAQ[]) => void;
  onCreatePolicy?: (policy: Omit<PolicyFAQ, 'id'>) => void;
  onUpdatePolicy?: (policy: PolicyFAQ) => void;
  onDeletePolicy?: (id: string) => void;
  onUpdateSettings: (updatedSettings: AppSettings) => void;
  onAddActivity: (type: 'tenant' | 'billing' | 'addon' | 'ticket' | 'notification', action: string, details: string) => void;
}

export default function SettingsView({ 
  policies, 
  settings, 
  onUpdatePolicies, 
  onCreatePolicy,
  onUpdatePolicy,
  onDeletePolicy,
  onUpdateSettings,
  onAddActivity
}: SettingsViewProps) {
  const { showToast, ToastElement } = useToast();
  const { confirmDialog, DialogElement } = useDialog();
  
  // Rule Lock states local copies
  const [lockSingleUse, setLockSingleUse] = useState(settings.lockSingleUseTermsTo6Months);
  const [enforceNotice, setEnforceNotice] = useState(settings.requiresNotice24To48Hours);
  const [enforceGdpr, setEnforceGdpr] = useState(settings.enforceGdprAnonymization);
  const [enable2FA, setEnable2FA] = useState(settings.enableTwoFactorAuthLock);

  // Policy Management states
  const [editingPolicy, setEditingPolicy] = useState<PolicyFAQ | null>(null);
  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);
  const [policyForm, setPolicyForm] = useState({ category: '', question: '', answer: '' });

  const handleEditPolicy = (p: PolicyFAQ) => {
    setEditingPolicy(p);
    setPolicyForm({ category: p.category, question: p.question, answer: p.answer });
  };

  const handleSavePolicy = () => {
    if (editingPolicy && onUpdatePolicy) {
      onUpdatePolicy({ ...editingPolicy, ...policyForm });
      showToast('Policy successfully updated.');
      setEditingPolicy(null);
    } else if (isCreatingPolicy && onCreatePolicy) {
      onCreatePolicy(policyForm);
      showToast('New policy successfully created.');
      setIsCreatingPolicy(false);
    }
    setPolicyForm({ category: '', question: '', answer: '' });
  };
  
  const handleDeletePolicy = async (id: string) => {
    const confirmed = await confirmDialog(
      'Delete Policy',
      'Are you sure you want to delete this policy? This action cannot be undone.'
    );
    if (confirmed && onDeletePolicy) {
      onDeletePolicy(id);
      showToast('Policy deleted.');
    }
  };
  
  // Handle operation toggles save
  const handleSaveOperationalRules = () => {
    const updatedSettings: AppSettings = {
      ...settings,
      lockSingleUseTermsTo6Months: lockSingleUse,
      requiresNotice24To48Hours: enforceNotice,
      enforceGdprAnonymization: enforceGdpr,
      enableTwoFactorAuthLock: enable2FA
    };
    onUpdateSettings(updatedSettings);

    onAddActivity(
      'tenant',
      'Updated Property Operational Locks',
      `Locked lease length: ${lockSingleUse ? 'ON' : 'OFF'}. Enforced notice: ${enforceNotice ? 'ON' : 'OFF'}. GDPR Vaulting: ${enforceGdpr ? 'ON' : 'OFF'}. 2FA Access Lock: ${enable2FA ? 'ON' : 'OFF'}.`
    );

    showToast('Property parameters successfully updated. Policy adjustments applied across active compliance checklist rules.');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {ToastElement}
      <DialogElement />
      
      {/* Upper Grid: Operational Parameter Locks & Core brand principles info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core Operations Locks - span 2 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs flex flex-col justify-between">
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2.5 border-b border-brand-border pb-4">
                <div className="p-2 bg-brand-surface text-brand-primary border border-brand-border rounded-xl">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-brand-dark text-sm font-serif">Property Operations Rule Locking</h4>
                  <p className="text-[10px] text-brand-stone font-medium">Control automatic compliance validation parameters</p>
                </div>
              </div>

              <div className="space-y-5 text-xs">
                
                {/* Rule Toggle 1 */}
                <div className="flex items-start justify-between gap-4 p-4 bg-brand-surface border border-brand-border rounded-xl">
                  <div className="space-y-1">
                    <span className="font-bold text-brand-dark block">
                      Enforce Long-Stay Focus Lock (6M - 1Y)
                    </span>
                    <p className="text-brand-secondary leading-normal font-medium">
                      Locks lease templates, preventing staff from generating initial terms shorter than 6 months. Encourages neighborhood integration and lower occupant turnover.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLockSingleUse(!lockSingleUse)}
                    className="shrink-0 text-brand-secondary transition-colors cursor-pointer"
                  >
                    {lockSingleUse ? (
                      <ToggleRight className="h-7 w-7 text-brand-primary" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-[#A8A294]" />
                    )}
                  </button>
                </div>

                {/* Rule Toggle 2 */}
                <div className="flex items-start justify-between gap-4 p-4 bg-brand-surface border border-brand-border rounded-xl">
                  <div className="space-y-1">
                    <span className="font-bold text-brand-dark block">
                      Enforce Housekeeping 24-48h Advance Window Notice
                    </span>
                    <p className="text-brand-secondary leading-normal font-medium">
                      Flags housekeeping bookings set with under 24 hours warning and enforces compliance pop-ups on both staff dashboard and client apps.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnforceNotice(!enforceNotice)}
                    className="shrink-0 text-brand-secondary transition-colors cursor-pointer"
                  >
                    {enforceNotice ? (
                      <ToggleRight className="h-7 w-7 text-brand-primary" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-[#A8A294]" />
                    )}
                  </button>
                </div>

                {/* Rule Toggle 3 */}
                <div className="flex items-start justify-between gap-4 p-4 bg-brand-surface border border-brand-border rounded-xl">
                  <div className="space-y-1">
                    <span className="font-bold text-brand-dark block">
                      Enforce GDPR 30-Day Check-Out Anonymization
                    </span>
                    <p className="text-brand-secondary leading-normal font-medium">
                      Auto-scrub checked-out tenant logging activities and securely delete uploaded identity/passport records from the persistent cloud server after a 30-day audit window.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnforceGdpr(!enforceGdpr)}
                    className="shrink-0 text-brand-secondary transition-colors cursor-pointer"
                  >
                    {enforceGdpr ? (
                      <ToggleRight className="h-7 w-7 text-brand-primary" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-[#A8A294]" />
                    )}
                  </button>
                </div>

                {/* Rule Toggle 4 */}
                <div className="flex items-start justify-between gap-4 p-4 bg-brand-surface border border-brand-border rounded-xl">
                  <div className="space-y-1">
                    <span className="font-bold text-brand-dark block">
                      Enable Portal Security 2FA Verification Lockage
                    </span>
                    <p className="text-brand-secondary leading-normal font-medium">
                      Activates mandatory secondary verification pins and admin authorization gates before changing pricing parameters or manually executing guest check-out logs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnable2FA(!enable2FA)}
                    className="shrink-0 text-brand-secondary transition-colors cursor-pointer"
                  >
                    {enable2FA ? (
                      <ToggleRight className="h-7 w-7 text-brand-primary" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-[#A8A294]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-brand-border flex justify-end">
              <button
                onClick={handleSaveOperationalRules}
                className="px-4 py-2 bg-brand-primary hover:bg-[#4E4E37] text-white border border-brand-primary font-bold rounded-xl text-xs flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <Save className="h-3.5 w-3.5 text-[#F5F5F0]" />
                <span>Save Property Settings</span>
              </button>
            </div>

          </div>
        </div>

        {/* Brand Principles Explanation Sidebar */}
        <div className="lg:col-span-1 relative">
          {/* Solid shadow layer as a background */}
          <div className="absolute inset-0 bg-brand-primary/10 rounded-2xl translate-x-1.5 translate-y-1.5"></div>
          
          <div className="relative bg-brand-surface text-brand-dark rounded-2xl p-6 border border-brand-stone/60 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-brand-primary">
                <Sparkles className="h-5 w-5 text-brand-primary" />
                <h4 className="font-bold text-natural-dark-olive text-sm font-serif">Seven Rocks Value Manifesto</h4>
              </div>
              
              <div className="space-y-3.5 text-xs font-medium leading-relaxed text-brand-secondary">
                <p>
                  Our properties thrive on being <strong className="text-brand-dark">Transparent, Flexible, and Long-Stay Focused</strong>.
                </p>
                <p>
                  By establishing automated system-wide locks, we protect:
                </p>
                <ul className="list-disc pl-4 space-y-1.5 text-brand-secondary font-medium">
                  <li><strong className="text-brand-dark">Transparency:</strong> Fixed, published prices for extras, admin move-in fees (€90.00) and surcharges (€85.00/month).</li>
                  <li><strong className="text-brand-dark">Flexibility:</strong> Integrated, easy extensions with auto deposit multiplier checks (1.5x vs 2x rent).</li>
                  <li><strong className="text-brand-dark">Long-Stay:</strong> Restricting speculative overnight tourist rentals, fostering healthy residential community growth.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-3 bg-brand-bg border border-brand-border rounded-xl flex items-center gap-2 text-[10px] text-brand-secondary font-semibold">
              <Info className="h-4 w-4 text-brand-primary shrink-0" />
              <span>Settings changes immediately restrict app capabilities.</span>
            </div>
          </div>
        </div>

      </div>

      {/* --- TERMS & POLICIES MANAGEMENT --- */}
      <div className="mt-12 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-serif font-bold text-natural-dark-olive">Terms & Policies Management</h3>
            <p className="text-xs text-brand-secondary font-medium">Update the rules and guidelines visible to tenants in their portal.</p>
          </div>
          <button
            onClick={() => { setIsCreatingPolicy(true); setEditingPolicy(null); setPolicyForm({ category: 'house_rules', question: '', answer: '' }); }}
            className="px-4 py-2 bg-brand-primary hover:bg-[#4E4E37] text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Policy</span>
          </button>
        </div>

        <div className="space-y-4">
          {policies.map(policy => (
            <div key={policy.id} className="p-4 bg-brand-surface border border-brand-border rounded-xl flex items-start justify-between">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-bold uppercase tracking-wider rounded-md">
                    {policy.category.replace('_', ' ')}
                  </span>
                  <h4 className="font-bold text-brand-dark text-sm">{policy.question}</h4>
                </div>
                <p className="text-xs text-brand-secondary line-clamp-2">{policy.answer}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleEditPolicy(policy)}
                  className="p-2 text-brand-secondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeletePolicy(policy.id)}
                  className="p-2 text-brand-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {policies.length === 0 && (
            <div className="p-8 text-center text-brand-secondary bg-brand-surface border border-brand-border border-dashed rounded-xl">
              No policies found. Click "Add New Policy" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Policy Modal */}
      {(editingPolicy || isCreatingPolicy) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-[#F5F5F0] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-[#D5D2C4]">
            <div className="p-5 border-b border-[#D5D2C4] flex items-center justify-between bg-white">
              <h3 className="font-serif font-bold text-lg text-natural-dark-olive">
                {isCreatingPolicy ? 'Create New Policy' : 'Edit Policy'}
              </h3>
              <button 
                onClick={() => { setEditingPolicy(null); setIsCreatingPolicy(false); }}
                className="p-1 text-[#8C877A] hover:bg-[#EAE8DF] rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-natural-dark-olive mb-1.5 uppercase tracking-wider">Category</label>
                <select 
                  className="w-full p-2.5 bg-white border border-[#D5D2C4] rounded-xl text-sm text-[#4E4E37] focus:border-[#7A7A5C] focus:ring-1 focus:ring-[#7A7A5C] transition-all outline-none font-medium"
                  value={policyForm.category}
                  onChange={e => setPolicyForm({...policyForm, category: e.target.value})}
                >
                  <option value="house_rules">House Rules</option>
                  <option value="billing">Billing</option>
                  <option value="checkin_checkout">Check-In / Check-Out</option>
                  <option value="legal">Legal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-natural-dark-olive mb-1.5 uppercase tracking-wider">Title / Question</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-white border border-[#D5D2C4] rounded-xl text-sm text-[#4E4E37] focus:border-[#7A7A5C] focus:ring-1 focus:ring-[#7A7A5C] transition-all outline-none font-medium"
                  value={policyForm.question}
                  onChange={e => setPolicyForm({...policyForm, question: e.target.value})}
                  placeholder="e.g. Quiet Hours & Sound Etiquette"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-natural-dark-olive mb-1.5 uppercase tracking-wider">Details / Answer</label>
                <textarea 
                  className="w-full p-2.5 bg-white border border-[#D5D2C4] rounded-xl text-sm text-[#4E4E37] focus:border-[#7A7A5C] focus:ring-1 focus:ring-[#7A7A5C] transition-all outline-none font-medium min-h-[120px]"
                  value={policyForm.answer}
                  onChange={e => setPolicyForm({...policyForm, answer: e.target.value})}
                  placeholder="Detailed guidelines..."
                />
              </div>
            </div>
            
            <div className="p-5 border-t border-[#D5D2C4] bg-white flex justify-end space-x-3">
              <button 
                onClick={() => { setEditingPolicy(null); setIsCreatingPolicy(false); }}
                className="px-4 py-2 text-sm font-bold text-[#8C877A] hover:bg-[#EAE8DF] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePolicy}
                disabled={!policyForm.question || !policyForm.answer || !policyForm.category}
                className="px-4 py-2 bg-[#7A7A5C] hover:bg-[#4E4E37] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {isCreatingPolicy ? 'Create Policy' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
