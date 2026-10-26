"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Search, 
  Filter, 
  Check, 
  X, 
  Info, 
  Building2, 
  User, 
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Tenant, TenantVerificationChecklist, VerificationCheckpoint } from '../types';

interface StaffVerificationViewProps {
  tenants: Tenant[];
  onUpdateTenant: (tenant: Tenant) => Promise<void> | void;
  onAddActivity?: (type: 'tenant' | 'billing' | 'ticket' | 'notification' | 'addon', action: string, details?: string) => void;
  searchTerm?: string;
  setSearchTerm?: (val: string) => void;
}

type CheckpointKey = keyof TenantVerificationChecklist;

const CHECKPOINTS: { key: CheckpointKey; label: string; description: string }[] = [
  { key: 'rentReceived', label: 'Rent Received', description: 'Initial rent receipt verified against PMS / banking records.' },
  { key: 'securityDeposit', label: 'Security Deposit', description: 'Holding deposit confirmed received by operations.' },
  { key: 'adminFee', label: 'Admin Setup Fee', description: 'Mandatory tenant onboarding / administration fee verified.' },
  { key: 'finalDeparture', label: 'Departure Clearance', description: 'Final key return, room inspection & account clearance.' },
];

export default function StaffVerificationView({
  tenants,
  onUpdateTenant,
  onAddActivity,
  searchTerm: parentSearchTerm,
  setSearchTerm: parentSetSearchTerm
}: StaffVerificationViewProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_action' | 'fully_cleared' | 'Checked-In' | 'Pending' | 'Checked-Out'>('all');
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string }>({ name: 'Ops Staff', email: 'staff@sevenrocks.com' });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const effectiveSearch = parentSearchTerm !== undefined ? parentSearchTerm : localSearch;
  const updateSearch = parentSetSearchTerm || setLocalSearch;

  // Retrieve current logged in staff details for audit trail
  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser({
            name: data.user.name || data.user.email?.split('@')[0] || 'Staff Ops',
            email: data.user.email || 'staff@sevenrocks.com'
          });
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Ensure every tenant has a verification checklist object
  const getChecklist = (t: Tenant): TenantVerificationChecklist => {
    return t.verificationChecklist || {
      rentReceived: { status: 'Pending' },
      securityDeposit: { status: t.depositStatus === 'Paid' ? 'Approved' : 'Pending' },
      adminFee: { status: 'Pending' },
      finalDeparture: { status: t.status === 'Checked-Out' ? 'Approved' : 'Pending' },
    };
  };

  // Filtered tenants list
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const q = effectiveSearch.toLowerCase().trim();
      const matchesSearch = !q || 
        t.name.toLowerCase().includes(q) ||
        t.roomNumber.toLowerCase().includes(q) ||
        t.building.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const cl = getChecklist(t);
      const isComplete = cl.rentReceived.status === 'Approved' &&
                         cl.securityDeposit.status === 'Approved' &&
                         cl.adminFee.status === 'Approved';

      if (statusFilter === 'needs_action') {
        return !isComplete;
      }
      if (statusFilter === 'fully_cleared') {
        return isComplete;
      }
      if (statusFilter === 'Checked-In' || statusFilter === 'Pending' || statusFilter === 'Checked-Out') {
        return t.status === statusFilter;
      }
      return true;
    });
  }, [tenants, effectiveSearch, statusFilter]);

  // Overall metrics
  const metrics = useMemo(() => {
    let rentApproved = 0;
    let depositApproved = 0;
    let feeApproved = 0;
    let departureApproved = 0;

    tenants.forEach(t => {
      const cl = getChecklist(t);
      if (cl.rentReceived.status === 'Approved') rentApproved++;
      if (cl.securityDeposit.status === 'Approved') depositApproved++;
      if (cl.adminFee.status === 'Approved') feeApproved++;
      if (cl.finalDeparture.status === 'Approved') departureApproved++;
    });

    return {
      total: tenants.length,
      rentApproved,
      depositApproved,
      feeApproved,
      departureApproved,
    };
  }, [tenants]);

  // Handle toggling verification status
  const handleToggleCheckpoint = async (tenant: Tenant, key: CheckpointKey) => {
    const actionKey = `${tenant.id}-${key}`;
    setUpdatingId(actionKey);

    const currentChecklist = getChecklist(tenant);
    const current = currentChecklist[key];
    const willApprove = current.status !== 'Approved';

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedCheckpoint: VerificationCheckpoint = willApprove ? {
      status: 'Approved',
      approvedBy: currentUser.name,
      approvedAt: nowStr
    } : {
      status: 'Pending',
      approvedBy: undefined,
      approvedAt: undefined
    };

    const newChecklist: TenantVerificationChecklist = {
      ...currentChecklist,
      [key]: updatedCheckpoint
    };

    // Keep depositStatus in sync if securityDeposit was modified
    let newDepositStatus = tenant.depositStatus;
    if (key === 'securityDeposit') {
      newDepositStatus = willApprove ? 'Paid' : 'Pending';
    }

    const updatedTenant: Tenant = {
      ...tenant,
      depositStatus: newDepositStatus,
      verificationChecklist: newChecklist
    };

    try {
      await onUpdateTenant(updatedTenant);
      const label = CHECKPOINTS.find(c => c.key === key)?.label || key;
      const statusText = willApprove ? 'Approved' : 'Marked Pending';
      showToast(`${label} for ${tenant.name} ${statusText}.`);
      
      if (onAddActivity) {
        onAddActivity(
          'tenant',
          `Verification ${statusText}`,
          `${currentUser.name} ${statusText.toLowerCase()} ${label} for ${tenant.name} (${tenant.roomNumber}).`
        );
      }
    } catch (err: any) {
      showToast(`Error updating verification: ${err.message || 'Network error'}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#3C3C2A] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold border border-white/10 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#5A5A40] rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between shadow-brand border border-[#4A4A33]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <ClipboardCheck className="h-6 w-6 text-emerald-300" />
            <h2 className="text-xl font-bold font-serif tracking-tight !text-white">Staff Verification Checklist</h2>
          </div>
          <p className="text-xs text-[#E5E0D8]/80 font-medium">
            Internal operational sign-off for resident clearances. Approvals record the reviewer identity and timestamp.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#4A4A33] text-emerald-300 text-xs font-bold rounded-xl border border-white/10">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Staff Reviewer: {currentUser.name}</span>
          </span>
        </div>
      </div>

      {/* Operational Policy Guide */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start space-x-3 text-xs">
        <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-amber-900 leading-relaxed font-medium">
          <strong className="font-bold">Zero-Calculation Verification Policy:</strong> Staff verify checkpoints manually against the PMS or approved external banking statements before marking approval. In accordance with platform governance, this screen processes no monetary sums or automatic transactions.
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Residents</span>
          <p className="text-2xl font-serif text-brand-dark font-bold">{metrics.total}</p>
          <span className="text-[11px] text-brand-secondary">In active directory</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Rent Verified</span>
          <p className="text-2xl font-serif text-brand-primary font-bold">{metrics.rentApproved} <span className="text-xs text-brand-stone font-normal font-sans">/ {metrics.total}</span></p>
          <span className="text-[11px] text-emerald-700 font-semibold">{Math.round((metrics.rentApproved / (metrics.total || 1)) * 100)}% approved</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Deposit Verified</span>
          <p className="text-2xl font-serif text-brand-primary font-bold">{metrics.depositApproved} <span className="text-xs text-brand-stone font-normal font-sans">/ {metrics.total}</span></p>
          <span className="text-[11px] text-emerald-700 font-semibold">{Math.round((metrics.depositApproved / (metrics.total || 1)) * 100)}% approved</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Admin Fee</span>
          <p className="text-2xl font-serif text-brand-primary font-bold">{metrics.feeApproved} <span className="text-xs text-brand-stone font-normal font-sans">/ {metrics.total}</span></p>
          <span className="text-[11px] text-emerald-700 font-semibold">{Math.round((metrics.feeApproved / (metrics.total || 1)) * 100)}% approved</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs space-y-1 col-span-2 md:col-span-1">
          <span className="text-[10px] uppercase font-bold text-brand-stone tracking-wider">Departure Clearance</span>
          <p className="text-2xl font-serif text-brand-primary font-bold">{metrics.departureApproved}</p>
          <span className="text-[11px] text-brand-stone">Clearances logged</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-stone" />
          <input
            type="text"
            value={effectiveSearch}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search resident, room number, or property..."
            className="w-full pl-9 pr-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-brand-stone font-bold mr-1 flex items-center">
            <Filter className="h-3 w-3 mr-1" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'needs_action', label: 'Needs Action' },
            { id: 'fully_cleared', label: 'Fully Approved' },
            { id: 'Checked-In', label: 'Checked-In' },
            { id: 'Pending', label: 'Pending Check-In' },
            { id: 'Checked-Out', label: 'Checked-Out' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'bg-brand-surface text-brand-secondary hover:text-brand-dark border border-brand-border'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Verification Matrix Table */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-brand-surface/70 border-b border-brand-border text-brand-stone uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3.5 px-4 font-bold">Resident / Premises</th>
                <th className="py-3.5 px-4 font-bold text-center">Rent Received</th>
                <th className="py-3.5 px-4 font-bold text-center">Security Deposit</th>
                <th className="py-3.5 px-4 font-bold text-center">Admin Setup Fee</th>
                <th className="py-3.5 px-4 font-bold text-center">Departure Clearance</th>
                <th className="py-3.5 px-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-stone">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-brand-stone/60" />
                    <p className="font-bold text-sm">No residents found matching current filters.</p>
                    <p className="text-xs mt-1">Try clearing your search term or selecting another filter category.</p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const cl = getChecklist(t);

                  const checkpointsCompleted = [
                    cl.rentReceived.status === 'Approved',
                    cl.securityDeposit.status === 'Approved',
                    cl.adminFee.status === 'Approved'
                  ].filter(Boolean).length;

                  return (
                    <tr key={t.id} className="hover:bg-brand-surface/30 transition-colors">
                      {/* Resident Info Column */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-brand-dark text-sm">{t.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'Checked-In'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : t.status === 'Checked-Out'
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-brand-stone">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span>Unit {t.roomNumber} &bull; {t.building}</span>
                          </div>
                          <div className="text-[10px] text-brand-stone/80 font-mono">
                            {t.contractStartDate || 'N/A'} &rarr; {t.contractEndDate || 'N/A'} ({t.contractLengthMonths}m)
                          </div>
                        </div>
                      </td>

                      {/* 1. Rent Received Checkpoint */}
                      <td className="py-4 px-4 align-top text-center">
                        <CheckpointButton
                          checkpoint={cl.rentReceived}
                          isLoading={updatingId === `${t.id}-rentReceived`}
                          onToggle={() => handleToggleCheckpoint(t, 'rentReceived')}
                        />
                      </td>

                      {/* 2. Security Deposit Checkpoint */}
                      <td className="py-4 px-4 align-top text-center">
                        <CheckpointButton
                          checkpoint={cl.securityDeposit}
                          isLoading={updatingId === `${t.id}-securityDeposit`}
                          onToggle={() => handleToggleCheckpoint(t, 'securityDeposit')}
                        />
                      </td>

                      {/* 3. Administration Fee Checkpoint */}
                      <td className="py-4 px-4 align-top text-center">
                        <CheckpointButton
                          checkpoint={cl.adminFee}
                          isLoading={updatingId === `${t.id}-adminFee`}
                          onToggle={() => handleToggleCheckpoint(t, 'adminFee')}
                        />
                      </td>

                      {/* 4. Final Departure Clearance Checkpoint */}
                      <td className="py-4 px-4 align-top text-center">
                        <CheckpointButton
                          checkpoint={cl.finalDeparture}
                          isLoading={updatingId === `${t.id}-finalDeparture`}
                          onToggle={() => handleToggleCheckpoint(t, 'finalDeparture')}
                          accentColor="slate"
                        />
                      </td>

                      {/* Progress / Actions */}
                      <td className="py-4 px-4 align-top text-right">
                        <div className="space-y-1.5">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            checkpointsCompleted === 3
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-brand-surface text-brand-secondary border border-brand-border'
                          }`}>
                            {checkpointsCompleted} / 3 Onboarding Verified
                          </span>
                          {cl.finalDeparture.status === 'Approved' && (
                            <span className="block text-[10px] text-slate-500 font-semibold">
                              ✓ Departure Cleared
                            </span>
                          )}
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

    </div>
  );
}

interface CheckpointButtonProps {
  checkpoint: VerificationCheckpoint;
  isLoading: boolean;
  onToggle: () => void;
  accentColor?: 'emerald' | 'slate';
}

function CheckpointButton({
  checkpoint,
  isLoading,
  onToggle,
  accentColor = 'emerald'
}: CheckpointButtonProps) {
  const isApproved = checkpoint.status === 'Approved';

  return (
    <div className="flex flex-col items-center space-y-1">
      <button
        type="button"
        disabled={isLoading}
        onClick={onToggle}
        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs ${
          isApproved
            ? accentColor === 'slate'
              ? 'bg-slate-700 hover:bg-slate-800 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-brand-surface hover:bg-amber-100/70 text-amber-900 border border-amber-300'
        } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {isApproved ? (
          <>
            <Check className="h-3.5 w-3.5 text-white" />
            <span>Approved</span>
          </>
        ) : (
          <>
            <Clock className="h-3.5 w-3.5 text-amber-700" />
            <span>Pending</span>
          </>
        )}
      </button>

      {/* Reviewer & Timestamp audit note */}
      {isApproved && (
        <div className="text-[9px] text-brand-stone leading-tight max-w-[130px] truncate">
          <span className="font-semibold text-brand-dark">{checkpoint.approvedBy || 'Staff'}</span>
          {checkpoint.approvedAt && (
            <span className="block text-[8px] text-brand-stone/70">
              {checkpoint.approvedAt.split(' ')[0]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
