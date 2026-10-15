"use client";
import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import TenantsView from '../../../components/TenantsView';
import { useDashboardContext } from '../../../DashboardContext';
import { UserPlus, X, Loader2, CheckCircle2, AlertCircle, Mail } from 'lucide-react';

type WizardStep = 'form' | 'submitting' | 'success' | 'error';

export default function TenantsPage() {
  const router = useRouter();
  const ctx = useDashboardContext();

  const [showAddTenantWizard, setShowAddTenantWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('form');
  const [wizardError, setWizardError] = useState('');

  // Form fields
  const [wizName, setWizName] = useState('');
  const [wizEmail, setWizEmail] = useState('');
  const [wizPhone, setWizPhone] = useState('');
  const [wizRoom, setWizRoom] = useState('');
  const [wizPropertyType, setWizPropertyType] = useState('Co-Living');
  const [wizPropertyLocation, setWizPropertyLocation] = useState('');
  const [wizRent, setWizRent] = useState(1300);
  const [wizCheckIn, setWizCheckIn] = useState(() => new Date().toISOString().split('T')[0]);
  const [wizCheckOut, setWizCheckOut] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [wizExtraPerson, setWizExtraPerson] = useState(false);

  const resetWizard = () => {
    setWizName('');
    setWizEmail('');
    setWizPhone('');
    setWizRoom('');
    setWizPropertyType('Co-Living');
    setWizPropertyLocation('');
    setWizRent(1300);
    const today = new Date().toISOString().split('T')[0];
    setWizCheckIn(today);
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setWizCheckOut(d.toISOString().split('T')[0]);
    setWizExtraPerson(false);
    setWizardStep('form');
    setWizardError('');
  };

  const handleClose = () => {
    setShowAddTenantWizard(false);
    resetWizard();
  };

  const handleAddTenantSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!wizName.trim() || !wizEmail.trim() || !wizPhone.trim() || !wizRoom.trim()) {
      setWizardError('Please complete all required fields.');
      return;
    }

    const checkinDate = new Date(wizCheckIn);
    const checkoutDate = new Date(wizCheckOut);
    if (checkoutDate.getTime() <= checkinDate.getTime()) {
      setWizardError('Check-out date must be after check-in date.');
      return;
    }

    setWizardError('');
    setWizardStep('submitting');

    try {
      // ── Step 1: Calculate lease terms ──────────────────────────────
      const diffMs = checkoutDate.getTime() - checkinDate.getTime();
      const calculatedLength = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4)));
      const depositMultiplier = calculatedLength < 6 ? 1.5 : 2;
      const calculatedDeposit = wizRent * depositMultiplier;

      // ── Step 2: Create tenant via API ──────────────────────────────
      const tenantPayload = {
        fullName: wizName.trim(),
        email: wizEmail.trim().toLowerCase(),
        phone: wizPhone.trim(),
        roomNumber: wizRoom.trim(),
        propertyType: wizPropertyType,
        propertyLocation: wizPropertyLocation.trim() || 'Berlin Mitte Central',
        leaseStart: wizCheckIn,
        leaseEnd: wizCheckOut,
        contractLengthMonths: calculatedLength,
        rentAmount: wizRent,
        depositAmount: calculatedDeposit,
        depositStatus: 'Pending',
        oneTimeAdminFee: 90,
        hasExtraPerson: wizExtraPerson,
        status: 'pending',                     // starts Pending
        idVerificationStatus: 'pending',        // awaiting document upload
        contractVerified: false,
        activeAddOns: [],
        // userId is required by schema — use email as placeholder until auth is linked
        userId: wizEmail.trim().toLowerCase(),
      };

      const newTenant: any = await ctx.onCreateTenant(tenantPayload);
      if (!newTenant) throw new Error('Failed to create tenant record in database.');

      // ── Step 3: Generate move-in invoice via API ───────────────────
      const extraSurcharge = wizExtraPerson ? 85 : 0;
      const subtotal = wizRent + extraSurcharge + 90 + calculatedDeposit;
      const vatRate = 10;
      const vatAmount = parseFloat((subtotal * (vatRate / 100)).toFixed(2));
      const totalAmount = parseFloat((subtotal + vatAmount).toFixed(2));
      const dueDate = new Date(checkinDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const invoicePayload = {
        tenantId: newTenant.id,
        amount: totalAmount,
        rentAmount: wizRent,
        extraPersonSurcharge: extraSurcharge,
        addOnTotal: 0,
        adminFee: 90,
        depositAmount: calculatedDeposit,
        subtotal,
        vatRate,
        vatAmount,
        totalAmount,
        dueDate,
        type: 'Deposit',
        description: `Move-In Invoice: ${calculatedLength}mo lease for ${wizRoom.trim()} — incl. first month rent, €90 admin fee, €${calculatedDeposit.toFixed(2)} security deposit${wizExtraPerson ? ', €85 co-occupancy surcharge' : ''}`,
        status: 'Pending',
      };

      const newInvoice = await ctx.onCreateInvoice(invoicePayload);
      if (!newInvoice) throw new Error('Tenant created but failed to generate move-in invoice.');

      // ── Step 4: Log activity ───────────────────────────────────────
      ctx.onAddActivity(
        'tenant',
        'New Lease Intake Completed',
        `Onboarding initiated for ${newTenant.name} (${wizRoom.trim()}, ${calculatedLength}mo). Status: Pending document verification. Move-In Invoice generated. Deposit: €${calculatedDeposit.toFixed(2)}.`
      );

      setWizardStep('success');
    } catch (err: any) {
      console.error('Tenant intake failed:', err);
      setWizardError(err.message || 'An unexpected error occurred. Please try again.');
      setWizardStep('error');
    }
  };

  // ── Derived intake preview ──────────────────────────────────────────
  const getIntakePreview = () => {
    const checkinDateObj = new Date(wizCheckIn);
    const checkoutDateObj = new Date(wizCheckOut);
    const diffMs = checkoutDateObj.getTime() - checkinDateObj.getTime();
    const months = isNaN(diffMs) || diffMs <= 0 ? 6 : Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4)));
    const depositMultiplier = months < 6 ? 1.5 : 2;
    const deposit = wizRent * depositMultiplier;
    const extraSurcharge = wizExtraPerson ? 85 : 0;
    const subtotal = wizRent + extraSurcharge + 90 + deposit;
    const vat = subtotal * 0.10;
    return { months, deposit, depositMultiplier, subtotal, vat, total: subtotal + vat, extraSurcharge };
  };

  return (
    <>
      <TenantsView
        {...ctx}
        onUpdateTenant={ctx.onUpdateTenant}
        onDeleteTenant={ctx.onDeleteTenant}
        onOpenQuickAddTenant={() => { resetWizard(); setShowAddTenantWizard(true); }}
      />

      {showAddTenantWizard && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[92vh] animate-scale-up">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex justify-between items-start border-b border-slate-100 p-6 pb-4 sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">New Lease Intake Wizard</h3>
                  <p className="text-xs text-slate-400">Creates a Pending resident record & move-in invoice in the database</p>
                </div>
              </div>
              {wizardStep !== 'submitting' && (
                <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* ── Success State ───────────────────────────────────── */}
            {wizardStep === 'success' && (
              <div className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Onboarding Initiated!</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    <strong>{wizName}</strong> has been registered as a <strong>Pending</strong> resident.<br />
                    A move-in invoice has been generated.
                  </p>
                </div>

                {/* Email Confirmation */}
                <div className="w-full p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-left space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <Mail className="h-4 w-4 text-emerald-600" />
                    Onboarding Email Sent
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    An invitation email with the account setup link has been delivered to <strong className="text-slate-800">{wizEmail}</strong>.
                    The resident will use this link to set their password and access the Resident Portal.
                  </p>
                </div>

                <div className="w-full p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 text-left space-y-1">
                  <p className="font-bold">Next steps for admin:</p>
                  <p>1. Tenant opens email link to set password</p>
                  <p>2. Upload / verify <strong>Passport / ID</strong> in Document Vault</p>
                  <p>3. Upload / verify <strong>Signed Lease Contract</strong></p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Done — View Tenant Directory
                </button>
              </div>
            )}

            {/* ── Error State ─────────────────────────────────────── */}
            {wizardStep === 'error' && (
              <div className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-rose-500" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Intake Failed</h4>
                  <p className="text-xs text-slate-500 mt-1">{wizardError}</p>
                </div>
                <div className="flex w-full space-x-3">
                  <button
                    onClick={() => setWizardStep('form')}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Go Back & Retry
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Submitting State ────────────────────────────────── */}
            {wizardStep === 'submitting' && (
              <div className="p-8 flex flex-col items-center text-center space-y-4">
                <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Creating Resident Record…</h4>
                  <p className="text-xs text-slate-400 mt-1">Saving to database & generating move-in invoice</p>
                </div>
              </div>
            )}

            {/* ── Form ────────────────────────────────────────────── */}
            {wizardStep === 'form' && (
              <form onSubmit={handleAddTenantSubmit} className="p-6 space-y-4 text-xs">

                {wizardError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {wizardError}
                  </div>
                )}

                {/* Row 1 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-600">Full Name *</label>
                    <input
                      type="text" required placeholder="Jane Doe"
                      value={wizName} onChange={e => setWizName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-600">Email Address *</label>
                    <input
                      type="email" required placeholder="jane.doe@email.com"
                      value={wizEmail} onChange={e => setWizEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-600">Phone *</label>
                    <input
                      type="tel" required placeholder="+49 176 9988221"
                      value={wizPhone} onChange={e => setWizPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-600">Suite / Room *</label>
                    <input
                      type="text" required placeholder="Apt 201-B"
                      value={wizRoom} onChange={e => setWizRoom(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-600">Property Type</label>
                    <select
                      value={wizPropertyType} onChange={e => setWizPropertyType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                      {['Co-Living', 'Apartment', 'Penthouse', 'Suite', 'Studio', 'Room', 'Other'].map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-600">Building / Location</label>
                    <input
                      type="text" placeholder="e.g. Berlin Mitte Central"
                      value={wizPropertyLocation} onChange={e => setWizPropertyLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </div>

                {/* Row 4: Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-600">Lease Start *</label>
                    <input
                      type="date" required value={wizCheckIn} onChange={e => setWizCheckIn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-600">Lease End *</label>
                    <input
                      type="date" required value={wizCheckOut} onChange={e => setWizCheckOut(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </div>

                {/* Row 5: Rent + co-occupancy */}
                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-600">Monthly Rent (€) *</label>
                    <input
                      type="number" required min={0} value={wizRent}
                      onChange={e => setWizRent(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div className="flex items-center space-x-2.5 pt-4">
                    <input
                      type="checkbox" id="wizExtra"
                      checked={wizExtraPerson} onChange={e => setWizExtraPerson(e.target.checked)}
                      className="h-4 w-4 accent-emerald-600 cursor-pointer"
                    />
                    <label htmlFor="wizExtra" className="font-bold text-slate-600 cursor-pointer">
                      Co-occupant (+€85/mo)
                    </label>
                  </div>
                </div>

                {/* Live summary */}
                {(() => {
                  const p = getIntakePreview();
                  return (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 leading-relaxed">
                      <div className="flex justify-between font-bold text-slate-700 text-[11px]">
                        <span>Move-In Invoice Preview</span>
                        <span className="text-emerald-700 font-mono">Duration: {p.months} months</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                        <div>Monthly Rent: <strong className="text-slate-700">€{wizRent.toFixed(2)}</strong></div>
                        {p.extraSurcharge > 0 && <div>Co-Occupant: <strong className="text-slate-700">+€{p.extraSurcharge.toFixed(2)}</strong></div>}
                        <div>Admin Fee: <strong className="text-slate-700">€90.00</strong></div>
                        <div>
                          Security Deposit: <strong className="text-slate-700">€{p.deposit.toFixed(2)}</strong>
                          <span className="block text-[9px]">({p.depositMultiplier}x — {p.months < 6 ? 'stay <6mo' : 'stay ≥6mo'})</span>
                        </div>
                        <div>VAT (10%): <strong className="text-slate-700">€{p.vat.toFixed(2)}</strong></div>
                        <div className="font-bold text-slate-800">Total: <strong className="text-emerald-700">€{p.total.toFixed(2)}</strong></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="pt-2 flex justify-end space-x-3">
                  <button type="button" onClick={handleClose} className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Register & Generate Invoice
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
