"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ResidentPortal from '../../components/ResidentPortal';
import { Tenant, AddOnRequest, HousekeepingRequest, SupportTicket, Invoice, Notification, ContractExtensionRequest, AddOnService } from '../../types';

export default function PortalPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [addOnRequests, setAddOnRequests] = useState<AddOnRequest[]>([]);
  const [housekeepings, setHousekeepings] = useState<HousekeepingRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [extensionRequests, setExtensionRequests] = useState<ContractExtensionRequest[]>([]);
  const [catalogItems, setCatalogItems] = useState<AddOnService[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      // 1. Verify session
      const meRes = await fetch('/api/me');
      if (!meRes.ok) { router.push('/'); return; }
      const meData = await meRes.json();
      if (!meData.authenticated) { router.push('/'); return; }

      // 2. Load tenant profile
      const profileRes = await fetch('/api/me/tenant');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.tenant) {
          setTenant(profileData.tenant);
        } else {
          // No tenant profile yet — show a minimal pending state
          setTenant({
            id: meData.user.id,
            name: meData.user.name || meData.user.email.split('@')[0],
            email: meData.user.email,
            phone: '',
            roomNumber: 'Awaiting Assignment',
            building: 'Main Residence',
            status: 'Pending',
            contractStartDate: '',
            contractEndDate: '',
            contractLengthMonths: 6,
            idDocumentUrl: '',
            hasExtraPerson: false,
            depositStatus: 'Pending',
            depositAmount: 0,
            monthlyRent: 0,
            oneTimeAdminFee: 90,
            activeAddOns: [],
          });
        }
      }

      // 3. Load all tenant-specific data
      const dataRes = await fetch('/api/me/data');
      if (dataRes.ok) {
        const d = await dataRes.json();
        setAddOnRequests(d.addOnRequests || []);
        setHousekeepings(d.housekeepings || []);
        setTickets(d.tickets || []);
        setInvoices(d.invoices || []);
        setNotifications(d.notifications || []);
        setExtensionRequests(d.extensionRequests || []);
        setCatalogItems(d.catalogItems || []);
      }

      // 4. Load public policies
      const polRes = await fetch('/api/policies');
      if (polRes.ok) {
        const p = await polRes.json();
        setPolicies(p);
      }
    } catch (err) {
      console.error('Portal load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    router.push('/');
  };

  const handleAddAddOnRequest = async (newReq: AddOnRequest) => {
    try {
      const res = await fetch('/api/addon-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: newReq.tenantId, serviceId: newReq.serviceId }),
      });
      if (res.ok) {
        const saved = await res.json();
        setAddOnRequests(prev => [{
          ...newReq,
          id: saved.id,
          status: 'Pending',
          paymentStatus: 'Unpaid',
        }, ...prev]);
      }
    } catch (err) { console.error('Failed to submit add-on request:', err); }
  };

  const handleDeleteAddOnRequest = async (reqId: string) => {
    try {
      const res = await fetch(`/api/addon-requests/${reqId}`, { method: 'DELETE' });
      if (res.ok) {
        setAddOnRequests(prev => prev.filter(r => r.id !== reqId));
      }
    } catch (err) { console.error('Failed to delete add-on request:', err); }
  };

  const handleAddHousekeeping = async (newHkp: HousekeepingRequest) => {
    try {
      const res = await fetch('/api/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: newHkp.tenantId,
          date: newHkp.scheduleDate,
          frequency: newHkp.frequency,
          priceValue: newHkp.priceValue,
          specialInstructions: newHkp.notes || '',
          status: 'Pending',
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setHousekeepings(prev => [{ ...newHkp, id: saved.id }, ...prev]);
      }
    } catch (err) { console.error('Failed to submit housekeeping:', err); }
  };

  const handleDeleteHousekeeping = async (id: string) => {
    try {
      const res = await fetch(`/api/housekeeping/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHousekeepings(prev => prev.filter(h => h.id !== id));
      }
    } catch (err) { console.error('Failed to delete housekeeping:', err); }
  };

  const handleAddTicket = async (newTck: SupportTicket) => {
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: newTck.tenantId,
          subject: newTck.subject,
          description: newTck.description,
          priority: newTck.priority,
          status: 'Open',
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setTickets(prev => [{ ...newTck, id: saved.id }, ...prev]);
      }
    } catch (err) { console.error('Failed to submit ticket:', err); }
  };

  const handlePayInvoice = async (invoiceId: string, paymentMethod: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Paid', paymentMethod, paymentDate: new Date().toISOString().split('T')[0] }),
      });
      if (res.ok) {
        setInvoices(prev => prev.map(inv =>
          inv.id === invoiceId ? { ...inv, status: 'Paid', paymentMethod } : inv
        ));
      }
    } catch (err) { console.error('Failed to pay invoice:', err); }
  };

  const handleAddExtensionRequest = async (newReq: ContractExtensionRequest) => {
    try {
      const res = await fetch('/api/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReq),
      });
      if (res.ok) {
        const saved = await res.json();
        setExtensionRequests(prev => [saved, ...prev]);
      }
    } catch (err) { console.error('Failed to submit extension:', err); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <ResidentPortal
      tenant={tenant}
      addOnRequests={addOnRequests}
      catalogItems={catalogItems}
      housekeepings={housekeepings}
      tickets={tickets}
      invoices={invoices}
      notifications={notifications}
      settings={{
        lockSingleUseTermsTo6Months: true,
        requiresNotice24To48Hours: true,
        enforceGdprAnonymization: true,
        enableTwoFactorAuthLock: false,
        pricingTiers: {
          extraPersonSurcharge: 85,
          oneTimeAdminFee: 90,
          housekeepingMonthly: 140,
          housekeepingBiWeekly: 120,
          housekeepingSingle: 40,
        },
      }}
      onLogout={handleLogout}
      onAddAddOnRequest={handleAddAddOnRequest}
      onDeleteAddOnRequest={handleDeleteAddOnRequest}
      onAddHousekeeping={handleAddHousekeeping}
      onDeleteHousekeeping={handleDeleteHousekeeping}
      onAddTicket={handleAddTicket}
      onPayInvoice={handlePayInvoice}
      extensionRequests={extensionRequests}
      onAddExtensionRequest={handleAddExtensionRequest}
      policies={policies}
    />
  );
}
