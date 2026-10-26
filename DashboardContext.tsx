"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Tenant, SupportTicket, AddOnRequest, HousekeepingRequest, Invoice, Notification, ActivityLog, PolicyFAQ, AppSettings, AddOnService, ContractExtensionRequest } from './types';

const DashboardContext = createContext<any>(null);

/** Maps a raw DB tenant row → frontend Tenant type */
function mapTenant(t: any): Tenant {
  return {
    id: t.id,
    name: t.fullName,
    email: t.email,
    phone: t.phone || '',
    roomNumber: t.roomNumber || '',
    building: t.propertyLocation || '',
    propertyType: t.propertyType || '',
    propertyLocation: t.propertyLocation || '',
    status:
      t.status === 'active' ? 'Checked-In'
      : t.status === 'checked_out' ? 'Checked-Out'
      : 'Pending',
    contractStartDate: t.leaseStart || '',
    contractEndDate: t.leaseEnd || '',
    contractLengthMonths: t.contractLengthMonths || 6,
    idDocumentUrl: t.idDocumentUrl || '',
    idDocumentVerified: t.idVerificationStatus === 'verified',
    contractVerified: t.contractVerified ?? false,
    hasExtraPerson: t.hasExtraPerson ?? false,
    depositStatus: t.depositStatus || 'Pending',
    depositAmount: Number(t.depositAmount) || 0,
    monthlyRent: Number(t.rentAmount) || 0,
    oneTimeAdminFee: Number(t.oneTimeAdminFee) || 90,
    activeAddOns: t.activeAddOns || [],
    verificationChecklist: t.verificationChecklist || {
      rentReceived: { status: 'Pending' },
      securityDeposit: { status: t.depositStatus === 'Paid' ? 'Approved' : 'Pending' },
      adminFee: { status: 'Pending' },
      finalDeparture: { status: t.status === 'checked_out' ? 'Approved' : 'Pending' },
    },
  };
}

/** Maps a raw DB invoice row → frontend Invoice type */
function mapInvoice(i: any, tenantLookup: Record<string, any>): Invoice {
  const t = tenantLookup[i.tenantId];
  const totalAmount = Number(i.amount) || 0;
  const vatRate = Number(i.vatRate) || 10;
  const subtotal = i.subtotal ? Number(i.subtotal) : parseFloat((totalAmount / (1 + vatRate / 100)).toFixed(2));
  const vatAmount = i.vatAmount ? Number(i.vatAmount) : parseFloat((totalAmount - subtotal).toFixed(2));
  return {
    id: i.id,
    tenantId: i.tenantId,
    tenantName: t?.fullName || 'Resident',
    roomNumber: t?.roomNumber || 'Unknown',
    building: t?.propertyLocation || 'Unknown',
    date: i.createdAt ? new Date(i.createdAt).toISOString().split('T')[0] : i.dueDate,
    dueDate: i.dueDate || '',
    rentAmount: Number(i.rentAmount) || subtotal,
    extraPersonSurcharge: Number(i.extraPersonSurcharge) || 0,
    addOnTotal: Number(i.addOnTotal) || 0,
    adminFee: Number(i.adminFee) || 0,
    depositAmount: Number(i.depositAmount) || 0,
    subtotal,
    vatRate,
    vatAmount,
    totalAmount,
    status: (i.status as Invoice['status']) || 'Pending',
    type: i.type,
    description: i.description,
    paymentMethod: i.paymentMethod,
    paymentDate: i.paymentDate,
    paymentChannel: i.paymentChannel,
    notes: i.notes,
  };
}

export const DEFAULT_SETTINGS = {
  lockSingleUseTermsTo6Months: true,
  requiresNotice24To48Hours: true,
  enforceGdprAnonymization: true,
  enableTwoFactorAuthLock: false,
  pricingTiers: {
    extraPersonSurcharge: 100,
    oneTimeAdminFee: 90,
    housekeepingMonthly: 140,
    housekeepingBiWeekly: 80,
    housekeepingSingle: 40,
  }
};

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  // Primary Business States
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [addOnRequests, setAddOnRequests] = useState<AddOnRequest[]>([]);
  const [housekeepings, setHousekeepings] = useState<HousekeepingRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [policies, setPolicies] = useState<PolicyFAQ[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [catalogItems, setCatalogItems] = useState<AddOnService[]>([]);
  const [extensionRequests, setExtensionRequests] = useState<ContractExtensionRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // ─── Data Loading ────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [tRes, mRes, hRes, iRes, cRes, nRes, aRes, pRes, sRes, eRes, reqRes] = await Promise.all([
          fetch('/api/tenants'),
          fetch('/api/maintenance'),
          fetch('/api/housekeeping'),
          fetch('/api/invoices'),
          fetch('/api/addons'),
          fetch('/api/notifications'),
          fetch('/api/activities'),
          fetch('/api/policies'),
          fetch('/api/settings'),
          fetch('/api/extensions'),
          fetch('/api/addon-requests')
        ]);

        let rawTenants: any[] = [];

        if (tRes.ok) {
          rawTenants = await tRes.json();
          setTenants(rawTenants.map(mapTenant));
        } else {
          setTenants([]);
        }

        // Build lookup for enriching related records
        const tenantLookup: Record<string, any> = {};
        rawTenants.forEach((t: any) => { tenantLookup[t.id] = t; });

        if (mRes.ok) {
          const mData = await mRes.json();
          setTickets(mData.map((m: any) => ({
            id: m.id,
            tenantId: m.tenantId,
            tenantName: tenantLookup[m.tenantId]?.fullName || 'Resident',
            roomNumber: tenantLookup[m.tenantId]?.roomNumber || 'Unknown',
            building: tenantLookup[m.tenantId]?.propertyLocation || 'Unknown',
            subject: m.subject,
            description: m.description || m.subject,
            status: m.status,
            priority: m.priority,
            createdAt: m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : '',
            category: 'Maintenance',
          })));
        }

        if (hRes.ok) {
          const hData = await hRes.json();
          setHousekeepings(hData.map((h: any) => ({
            id: h.id,
            tenantId: h.tenantId,
            tenantName: tenantLookup[h.tenantId]?.fullName || 'Resident',
            roomNumber: tenantLookup[h.tenantId]?.roomNumber || 'Unknown',
            building: tenantLookup[h.tenantId]?.propertyLocation || 'Unknown',
            scheduleDate: h.date,
            requestedAt: h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : h.date,
            frequency: h.frequency || 'Single Use',
            priceValue: Number(h.priceValue) || 40,
            status: h.status,
            notes: h.specialInstructions,
          })));
        }

        if (iRes.ok) {
          const iData = await iRes.json();
          setInvoices(iData.map((i: any) => mapInvoice(i, tenantLookup)));
        }

        if (cRes.ok) {
          const cData = await cRes.json();
          setCatalogItems(cData.map((c: any) => ({
            id: c.id,
            name: c.name,
            desc: c.description || '',
            price: c.priceLabel || `€${c.price}`,
            priceVal: Number(c.price) || 0,
            type: c.type,
            category: (c.category as any) || 'other',
            iconName: (c.iconName as any) || 'Sparkles',
            badge: c.badge || undefined,
            options: Array.isArray(c.options) ? c.options : [],
          })));
        }
        if (reqRes && reqRes.ok) {
          const reqData = await reqRes.json();
          setAddOnRequests(reqData.map((r: any) => ({
            id: r.id,
            tenantId: r.tenantId,
            serviceId: r.serviceId,
            tenantName: r.tenantName || tenantLookup[r.tenantId]?.fullName || 'Resident',
            roomNumber: r.roomNumber || tenantLookup[r.tenantId]?.roomNumber || 'Unknown',
            building: tenantLookup[r.tenantId]?.propertyLocation || 'Unknown',
            category: 'Other' as const,
            serviceName: r.serviceName || 'Unknown Service',
            priceDetails: r.priceDetails || '',
            priceValue: Number(r.priceValue) || 0,
            requestDate: r.requestDate ? new Date(r.requestDate).toISOString().split('T')[0] : '',
            status: r.status || 'Pending',
            paymentStatus: r.paymentStatus || 'Unpaid',
          })));
        }
        if (nRes.ok) {
          const nData = await nRes.json();
          setNotifications(nData);
        }

        if (aRes.ok) {
          const aData = await aRes.json();
          setActivityLogs(aData);
        }

        if (pRes.ok) {
          const pData = await pRes.json();
          setPolicies(pData);
        }

        if (sRes.ok) {
          const sData = await sRes.json();
          setSettings(sData.id ? sData : DEFAULT_SETTINGS);
        }

        if (eRes.ok) {
          const eData = await eRes.json();
          setExtensionRequests(eData);
        }

      } catch (err) {
        console.error('Error loading backend data:', err);
      }
    }
    loadData();
  }, []);

  // ─── Tenant Mutations (API-backed) ───────────────────────────────────

  const handleCreateTenant = useCallback(async (tenantPayload: any): Promise<Tenant | null> => {
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantPayload),
      });
      if (!res.ok) {
        let errorMsg = 'Failed to create tenant';
        try {
          const errJson = await res.json();
          errorMsg = errJson.error || errJson.message || errorMsg;
        } catch {
          errorMsg = await res.text();
        }
        throw new Error(errorMsg);
      }
      const created = await res.json();
      const mapped = mapTenant(created);
      setTenants(prev => [mapped, ...prev]);
      return mapped;
    } catch (err: any) {
      console.error('Failed to create tenant:', err);
      throw err;
    }
  }, []);

  const handleUpdateTenant = useCallback(async (updated: Tenant) => {
    try {
      const payload: Record<string, any> = {
        fullName: updated.name,
        email: updated.email,
        phone: updated.phone,
        roomNumber: updated.roomNumber,
        propertyType: updated.propertyType,
        propertyLocation: updated.propertyLocation,
        leaseStart: updated.contractStartDate,
        leaseEnd: updated.contractEndDate,
        rentAmount: updated.monthlyRent,
        depositAmount: updated.depositAmount,
        depositStatus: updated.depositStatus,
        idDocumentUrl: updated.idDocumentUrl,
        contractVerified: updated.contractVerified,
        hasExtraPerson: updated.hasExtraPerson,
        contractLengthMonths: updated.contractLengthMonths,
        oneTimeAdminFee: updated.oneTimeAdminFee,
        activeAddOns: updated.activeAddOns,
        verificationChecklist: updated.verificationChecklist,
        status:
          updated.status === 'Checked-In' ? 'active'
          : updated.status === 'Checked-Out' ? 'checked_out'
          : 'pending',
        idVerificationStatus: updated.idDocumentVerified ? 'verified' : 'pending',
      };

      const res = await fetch(`/api/tenants/${updated.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      const savedDbRow = await res.json();
      const mappedSaved = mapTenant(savedDbRow);
      setTenants(prev => prev.map(t => (t.id === updated.id || t.email.toLowerCase() === updated.email.toLowerCase()) ? mappedSaved : t));
    } catch (err) {
      console.error('Failed to update tenant:', err);
      fetch('/api/tenants')
        .then(r => r.json())
        .then(data => setTenants(data.map(mapTenant)))
        .catch(() => {});
    }
  }, []);

  const handleDeleteTenant = useCallback(async (tenantId: string) => {
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      setTenants(prev => prev.filter(t => t.id !== tenantId));
    } catch (err) {
      console.error('Failed to delete tenant:', err);
    }
  }, []);

  const handleCreateInvoice = useCallback(async (invoicePayload: any): Promise<Invoice | null> => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      const tenantLookup: Record<string, any> = {};
      tenants.forEach(t => {
        tenantLookup[t.id] = { fullName: t.name, roomNumber: t.roomNumber, propertyLocation: t.building };
      });
      const mapped = mapInvoice(created, tenantLookup);
      setInvoices(prev => [mapped, ...prev]);
      return mapped;
    } catch (err) {
      console.error('Failed to create invoice:', err);
      return null;
    }
  }, [tenants]);

  const handleAddAddOnRequest = useCallback(async (newReq: AddOnRequest) => {
    try {
      const res = await fetch('/api/addon-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: newReq.tenantId,
          serviceId: newReq.serviceId,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        const mapped: AddOnRequest = {
          id: saved.id,
          tenantId: saved.tenantId,
          serviceId: saved.serviceId,
          tenantName: saved.tenantName || newReq.tenantName,
          roomNumber: saved.roomNumber || newReq.roomNumber,
          building: newReq.building,
          category: newReq.category,
          serviceName: saved.serviceName || newReq.serviceName,
          priceDetails: saved.priceDetails || newReq.priceDetails,
          priceValue: Number(saved.priceValue) || newReq.priceValue,
          requestDate: saved.requestDate ? new Date(saved.requestDate).toISOString().split('T')[0] : newReq.requestDate,
          status: (saved.status as any) || 'Pending',
          paymentStatus: (saved.paymentStatus as any) || 'Unpaid',
        };
        setAddOnRequests(prev => [mapped, ...prev]);
      }
    } catch (err) {
      console.error('Failed to save add-on request:', err);
    }
  }, []);

  const handleUpdateAddOnRequest = useCallback(async (updatedReq: AddOnRequest) => {
    try {
      const res = await fetch(`/api/addon-requests/${updatedReq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: updatedReq.status,
          paymentStatus: updatedReq.paymentStatus,
        }),
      });
      if (res.ok) {
        setAddOnRequests(prev =>
          prev.map(r => (r.id === updatedReq.id ? { ...r, ...updatedReq } : r))
        );
      } else {
        console.error('Failed to update add-on request');
      }
    } catch (err) {
      console.error('Failed to update add-on request:', err);
    }
  }, []);

  const handleAddHousekeeping = useCallback(async (newHkp: HousekeepingRequest) => {
    try {
      const res = await fetch('/api/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: newHkp.tenantId,
          date: newHkp.scheduleDate,
          specialInstructions: newHkp.notes || '',
          status: newHkp.status || 'Scheduled',
        }),
      });
      if (res.ok) {
        setHousekeepings(prev => [newHkp, ...prev]);
      }
    } catch (err) {
      console.error('Failed to save housekeeping request:', err);
    }
  }, []);

  const handleUpdateHousekeeping = useCallback(async (id: string, updates: Partial<HousekeepingRequest>) => {
    try {
      const res = await fetch(`/api/housekeeping/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setHousekeepings(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
      }
    } catch (err) {
      console.error('Failed to update housekeeping:', err);
    }
  }, []);

  const handleAddTicket = useCallback(async (newTck: SupportTicket) => {
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: newTck.tenantId,
          subject: newTck.subject,
          description: newTck.description,
          priority: newTck.priority,
          status: newTck.status || 'Open',
        }),
      });
      if (res.ok) {
        setTickets(prev => [newTck, ...prev]);
      }
    } catch (err) {
      console.error('Failed to save maintenance ticket:', err);
    }
  }, []);

  const handleUpdateTicketStatus = useCallback(async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status: status as any } : t));
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  }, []);

  const handlePayInvoice = useCallback(async (invoiceId: string, paymentMethod: string) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Paid',
          paymentMethod,
          paymentDate: today,
        }),
      });
      if (res.ok) {
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? {
          ...inv,
          status: 'Paid',
          paymentMethod,
          paymentDate: today,
        } : inv));
      }
    } catch (err) {
      console.error('Failed to update invoice payment status:', err);
    }
  }, []);

  const handleUpdateInvoiceStatus = useCallback(async (invoiceId: string, status: 'Paid' | 'Pending' | 'Overdue', paymentMethod?: string, paymentChannel?: 'Online' | 'Desk', notes?: string) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          paymentMethod,
          paymentDate: status === 'Paid' ? today : undefined,
          paymentChannel,
          notes,
        }),
      });
      if (res.ok) {
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? {
          ...inv,
          status,
          paymentMethod,
          paymentDate: status === 'Paid' ? today : undefined,
          paymentChannel,
        } : inv));
      }
    } catch (err) {
      console.error('Failed to update invoice status:', err);
    }
  }, []);

  const handleAddExtensionRequest = useCallback(async (newReq: ContractExtensionRequest) => {
    try {
      const res = await fetch('/api/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReq)
      });
      if (res.ok) {
        const created = await res.json();
        setExtensionRequests(prev => [created, ...prev]);
      }
    } catch (err) {
      console.error('Failed to create extension request:', err);
    }
  }, []);

  const handleAddActivity = useCallback(async (
    type: ActivityLog['type'],
    action: string,
    details: string
  ) => {
    const payload = {
      type,
      user: 'Admin (m.mahesh)',
      action,
      details,
    };
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const created = await res.json();
        setActivityLogs(prev => [created, ...prev]);
      }
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }, []);

  const handleAddCatalogItem = useCallback(async (newItem: AddOnService) => {
    try {
      const res = await fetch('/api/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItem.name,
          description: newItem.desc,
          price: String(newItem.priceVal),
          priceLabel: newItem.price,
          type: newItem.options?.length > 1 ? 'Subscription' : 'One-Time',
          category: newItem.category,
          iconName: newItem.iconName,
          badge: newItem.badge || null,
          options: newItem.options || [],
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        const mapped: AddOnService = {
          id: saved.id,
          name: saved.name,
          desc: saved.description || '',
          price: saved.priceLabel || `€${saved.price}`,
          priceVal: Number(saved.price) || 0,
          category: saved.category || 'other',
          iconName: saved.iconName || 'Sparkles',
          badge: saved.badge || undefined,
          options: Array.isArray(saved.options) ? saved.options : [],
        };
        setCatalogItems(prev => [mapped, ...prev]);
      }
    } catch (err) {
      console.error('Failed to create catalog item:', err);
    }
  }, []);

  const handleEditCatalogItem = useCallback(async (updatedItem: AddOnService) => {
    try {
      const res = await fetch(`/api/addons/${updatedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedItem.name,
          description: updatedItem.desc,
          price: String(updatedItem.priceVal),
          priceLabel: updatedItem.price,
          type: updatedItem.options?.length > 1 ? 'Subscription' : 'One-Time',
          category: updatedItem.category,
          iconName: updatedItem.iconName,
          badge: updatedItem.badge || null,
          options: updatedItem.options || [],
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        const mapped: AddOnService = {
          id: saved.id,
          name: saved.name,
          desc: saved.description || '',
          price: saved.priceLabel || `€${saved.price}`,
          priceVal: Number(saved.price) || 0,
          category: saved.category || 'other',
          iconName: saved.iconName || 'Sparkles',
          badge: saved.badge || undefined,
          options: Array.isArray(saved.options) ? saved.options : [],
        };
        setCatalogItems(prev => prev.map(i => i.id === updatedItem.id ? mapped : i));
      }
    } catch (err) {
      console.error('Failed to edit catalog item:', err);
    }
  }, []);

  const handleDeleteCatalogItem = useCallback(async (id: string) => {
    try {
      await fetch(`/api/addons/${id}`, { method: 'DELETE' });
      setCatalogItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Failed to delete catalog item:', err);
    }
  }, []);

  const handleAddNotification = useCallback(async (notification: Notification) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
      if (res.ok) {
        const created = await res.json();
        setNotifications(prev => [created, ...prev]);
      }
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  }, []);

  const value = {
    tenants, setTenants,
    notifications, setNotifications,
    addOnRequests, setAddOnRequests,
    housekeepings, setHousekeepings,
    tickets, setTickets,
    invoices, setInvoices,
    activityLogs, setActivityLogs,
    policies, setPolicies,
    settings, setSettings,
    catalogItems, setCatalogItems,
    extensionRequests, setExtensionRequests,
    searchTerm, setSearchTerm,
    onAddActivity: handleAddActivity,
    onAddNotification: handleAddNotification,
    onCreateTenant: handleCreateTenant,
    onUpdateTenant: handleUpdateTenant,
    onDeleteTenant: handleDeleteTenant,
    onCreateInvoice: handleCreateInvoice,
    onAddAddOnRequest: handleAddAddOnRequest,
    onUpdateAddOnRequest: handleUpdateAddOnRequest,
    onAddCatalogItem: handleAddCatalogItem,
    onEditCatalogItem: handleEditCatalogItem,
    onDeleteCatalogItem: handleDeleteCatalogItem,
    onAddHousekeeping: handleAddHousekeeping,
    onUpdateHousekeeping: handleUpdateHousekeeping,
    onAddTicket: handleAddTicket,
    onUpdateTicketStatus: handleUpdateTicketStatus,
    onPayInvoice: handlePayInvoice,
    onUpdateInvoiceStatus: handleUpdateInvoiceStatus,
    onAddExtensionRequest: handleAddExtensionRequest,
    onCreatePolicy: async (policy: Omit<PolicyFAQ, 'id'>) => {
      try {
        const res = await fetch('/api/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policy),
        });
        if (res.ok) {
          const newPolicy = await res.json();
          setPolicies(prev => [...prev, newPolicy]);
          handleAddActivity('tenant', 'Added Policy', `Added new policy in category ${policy.category}`);
        }
      } catch (err) { console.error(err); }
    },
    onUpdatePolicy: async (policy: PolicyFAQ) => {
      try {
        const res = await fetch(`/api/policies/${policy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policy),
        });
        if (res.ok) {
          const updated = await res.json();
          setPolicies(prev => prev.map(p => p.id === policy.id ? updated : p));
          handleAddActivity('tenant', 'Updated Policy', `Updated policy: ${policy.question}`);
        }
      } catch (err) { console.error(err); }
    },
    onDeletePolicy: async (id: string) => {
      try {
        const res = await fetch(`/api/policies/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setPolicies(prev => prev.filter(p => p.id !== id));
          handleAddActivity('tenant', 'Deleted Policy', `Deleted policy ID ${id}`);
        }
      } catch (err) { console.error(err); }
    },
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  return useContext(DashboardContext);
}
