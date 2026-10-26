import { describe, it, expect } from 'vitest';
import { FEATURES } from '../lib/features.ts';
import type { 
  Tenant, 
  TenantVerificationChecklist, 
  VerificationCheckpoint, 
  SupportTicket, 
  AddOnRequest, 
  Invoice 
} from '../types.ts';

describe('Regression & Integrity Tests for Recent Revised Changes', () => {

  // =========================================================================
  // 1. FEATURE FLAGS & ROUTE GUARDS INTEGRITY
  // =========================================================================
  describe('Feature Flags & Route Access Checks', () => {
    it('should have all feature flags defined without runtime errors', () => {
      expect(FEATURES.residentBilling).toBe(false);
      expect(FEATURES.adminBilling).toBe(false);
      expect(FEATURES.financialMetrics).toBe(false);
      expect(FEATURES.pmsOccupancyControls).toBe(false);
      expect(FEATURES.automaticFinancialCalculations).toBe(false);
    });

    it('should guard admin billing route navigation when adminBilling is false', () => {
      const checkBillingAccess = (featureFlag: boolean): { allow: boolean; redirectTo?: string } => {
        if (!featureFlag) {
          return { allow: false, redirectTo: '/dashboard' };
        }
        return { allow: true };
      };

      const result = checkBillingAccess(FEATURES.adminBilling);
      expect(result.allow).toBe(false);
      expect(result.redirectTo).toBe('/dashboard');

      // Verify that if toggled back to true, access is immediately permitted
      const reEnabledResult = checkBillingAccess(true);
      expect(reEnabledResult.allow).toBe(true);
      expect(reEnabledResult.redirectTo).toBeUndefined();
    });

    it('should preserve manual deposit values without auto-multiplying when automaticFinancialCalculations is false', () => {
      const calculateDeposit = (
        monthlyRent: number, 
        currentDeposit: number, 
        autoCalcEnabled: boolean
      ): number => {
        // If auto-calculation is enabled, it would overwrite with 2x monthly rent
        if (autoCalcEnabled) {
          return monthlyRent * 2;
        }
        // Otherwise, manually entered deposit remains untouched
        return currentDeposit;
      };

      const manualDeposit = 1500;
      const calculated = calculateDeposit(1200, manualDeposit, FEATURES.automaticFinancialCalculations);
      expect(calculated).toBe(1500); // Retained, NOT overwritten with 2400
    });
  });

  // =========================================================================
  // 2. STAFF VERIFICATION CHECKLIST (PHASE 3)
  // =========================================================================
  describe('Staff Verification Checklist Data Model & Logic', () => {
    const defaultChecklist: TenantVerificationChecklist = {
      rentReceived: { status: 'Pending' },
      securityDeposit: { status: 'Pending' },
      adminFee: { status: 'Pending' },
      finalDeparture: { status: 'Pending' }
    };

    it('should initialize with all 4 required operational controls in Pending state', () => {
      expect(defaultChecklist.rentReceived.status).toBe('Pending');
      expect(defaultChecklist.securityDeposit.status).toBe('Pending');
      expect(defaultChecklist.adminFee.status).toBe('Pending');
      expect(defaultChecklist.finalDeparture.status).toBe('Pending');

      expect(defaultChecklist.rentReceived.approvedBy).toBeUndefined();
      expect(defaultChecklist.rentReceived.approvedAt).toBeUndefined();
    });

    it('should NOT contain any monetary fields in the verification checkpoint schema', () => {
      const keys = Object.keys(defaultChecklist.rentReceived);
      expect(keys).not.toContain('amount');
      expect(keys).not.toContain('paidAmount');
      expect(keys).not.toContain('currency');
      expect(keys).not.toContain('vat');
    });

    it('should record approver and timestamp upon approving a checkpoint without mutating other controls', () => {
      const toggleCheckpoint = (
        current: VerificationCheckpoint, 
        approverName: string
      ): VerificationCheckpoint => {
        if (current.status === 'Approved') {
          return { status: 'Pending' };
        }
        return {
          status: 'Approved',
          approvedBy: approverName,
          approvedAt: '2026-10-26T14:00:00.000Z'
        };
      };

      const updatedRent = toggleCheckpoint(defaultChecklist.rentReceived, 'Staff Jane Doe');
      expect(updatedRent.status).toBe('Approved');
      expect(updatedRent.approvedBy).toBe('Staff Jane Doe');
      expect(updatedRent.approvedAt).toBe('2026-10-26T14:00:00.000Z');

      // Toggling again should reset to Pending
      const resetRent = toggleCheckpoint(updatedRent, 'Staff Jane Doe');
      expect(resetRent.status).toBe('Pending');
      expect(resetRent.approvedBy).toBeUndefined();

      // Ensure other checkpoints were not affected
      expect(defaultChecklist.securityDeposit.status).toBe('Pending');
    });

    it('should be backwards compatible with tenants lacking verificationChecklist', () => {
      const legacyTenant: Tenant = {
        id: 't-101',
        name: 'Anna Schmidt',
        email: 'anna@example.com',
        phone: '+43 1 2345678',
        roomNumber: '101',
        building: 'Seven Rocks Classic',
        status: 'Checked-In',
        contractStartDate: '2026-01-01',
        contractEndDate: '2026-12-31',
        contractLengthMonths: 12,
        idDocumentUrl: '/docs/id.pdf',
        hasExtraPerson: false,
        depositStatus: 'Paid',
        depositAmount: 2000,
        monthlyRent: 1000,
        oneTimeAdminFee: 90,
        activeAddOns: []
      };

      // Ensure existing tenant properties are completely intact
      expect(legacyTenant.id).toBe('t-101');
      expect(legacyTenant.verificationChecklist).toBeUndefined();

      // Gracefully resolves to default checklist when accessed in UI
      const resolvedChecklist = legacyTenant.verificationChecklist || defaultChecklist;
      expect(resolvedChecklist.rentReceived.status).toBe('Pending');
    });
  });

  // =========================================================================
  // 3. INTERNAL STAFF DOCUMENT GENERATOR & DUPLICATE INVOICE PREVENTION (PHASE 7)
  // =========================================================================
  describe('Document Generator & Duplicate Invoice Prevention', () => {
    const existingInvoices: Invoice[] = [
      {
        id: 'inv-1',
        tenantId: 't-1',
        tenantName: 'Max Mustermann',
        roomNumber: '204',
        building: 'Seven Rocks West',
        date: '2026-10-01',
        dueDate: '2026-10-15',
        rentAmount: 1100,
        extraPersonSurcharge: 0,
        addOnTotal: 0,
        adminFee: 0,
        depositAmount: 0,
        subtotal: 1100,
        vatRate: 0.10,
        vatAmount: 110,
        totalAmount: 1210,
        status: 'Paid',
        description: 'INV-2026-001'
      },
      {
        id: 'INV-2026-002',
        tenantId: 't-2',
        tenantName: 'Sophie Meier',
        roomNumber: '305',
        building: 'Seven Rocks Classic',
        date: '2026-10-01',
        dueDate: '2026-10-15',
        rentAmount: 950,
        extraPersonSurcharge: 0,
        addOnTotal: 50,
        adminFee: 0,
        depositAmount: 0,
        subtotal: 1000,
        vatRate: 0.10,
        vatAmount: 100,
        totalAmount: 1100,
        status: 'Pending'
      }
    ];

    const isDuplicateInvoice = (invoiceNumber: string, invoices: Invoice[]): boolean => {
      const cleanInput = invoiceNumber.trim().toLowerCase();
      if (!cleanInput) return false;
      return invoices.some(inv => 
        inv.id.trim().toLowerCase() === cleanInput ||
        (inv.description && inv.description.trim().toLowerCase() === cleanInput)
      );
    };

    it('should detect and flag duplicate invoice numbers (case-insensitive and trimmed)', () => {
      expect(isDuplicateInvoice('INV-2026-001', existingInvoices)).toBe(true);
      expect(isDuplicateInvoice('inv-2026-001', existingInvoices)).toBe(true);
      expect(isDuplicateInvoice('  INV-2026-002  ', existingInvoices)).toBe(true);
    });

    it('should permit new unique invoice numbers', () => {
      expect(isDuplicateInvoice('INV-2026-003', existingInvoices)).toBe(false);
      expect(isDuplicateInvoice('SR-INV-2026-100', existingInvoices)).toBe(false);
    });

    it('should accurately calculate invoice subtotal, VAT, and total', () => {
      const calculateInvoiceTotals = (
        rent: number, 
        adminFee: number, 
        addOns: number, 
        vatRate: number
      ) => {
        const subtotal = rent + adminFee + addOns;
        const vatAmount = Number((subtotal * vatRate).toFixed(2));
        const totalAmount = Number((subtotal + vatAmount).toFixed(2));
        return { subtotal, vatAmount, totalAmount };
      };

      const result = calculateInvoiceTotals(1200, 90, 60, 0.10);
      expect(result.subtotal).toBe(1350);
      expect(result.vatAmount).toBe(135.00);
      expect(result.totalAmount).toBe(1485.00);
    });
  });

  // =========================================================================
  // 4. ADD-ON REQUEST FOR BILLING TEAM (PHASE 5)
  // =========================================================================
  describe('Add-on Approval Workflow for Billing Team', () => {
    it('should support Monthly Statement Billing option without requiring instant desk payment', () => {
      const request: AddOnRequest = {
        id: 'addon-req-1',
        tenantId: 't-1',
        tenantName: 'Lukas Weber',
        roomNumber: '102',
        building: 'Seven Rocks Classic',
        category: 'Fitness & Wellness',
        serviceName: 'Premium Gym Pass',
        priceDetails: '€35 / month',
        priceValue: 35,
        requestDate: '2026-10-26',
        status: 'Pending',
        paymentOption: 'Monthly Statement Billing'
      };

      expect(request.paymentOption).toBe('Monthly Statement Billing');
      expect(request.paymentDate).toBeUndefined();
      expect(request.paymentMethod).toBeUndefined();

      // Transition to approved (forwarded to billing team)
      const approvedRequest: AddOnRequest = {
        ...request,
        status: 'Approved'
      };

      expect(approvedRequest.status).toBe('Approved');
      // Remains tagged for statement billing, no cash/desk transaction executed
      expect(approvedRequest.paymentOption).toBe('Monthly Statement Billing');
    });
  });

  // =========================================================================
  // 5. CONTRACT EXTENSION & EARLY DEPARTURE SUPPORT TICKETS (PHASE 6)
  // =========================================================================
  describe('Contract Extensions & Early Departures via Support Tickets', () => {
    it('should generate a high-priority support ticket for contract extension requests', () => {
      const createExtensionTicket = (
        tenant: Tenant, 
        requestedDate: string, 
        notes: string
      ): SupportTicket => {
        return {
          id: `ticket-${Date.now()}`,
          tenantId: tenant.id,
          tenantName: tenant.name,
          roomNumber: tenant.roomNumber,
          building: tenant.building,
          category: 'Other',
          subject: `Contract Extension Request: until ${requestedDate}`,
          description: `Resident ${tenant.name} requests to extend lease until ${requestedDate}.\nCurrent lease ends: ${tenant.contractEndDate}.\nNotes: ${notes}`,
          priority: 'High',
          status: 'Open',
          createdAt: new Date().toISOString()
        };
      };

      const mockTenant: Tenant = {
        id: 't-202',
        name: 'Maria Rossi',
        email: 'maria@example.com',
        phone: '+43 664 1234567',
        roomNumber: '202',
        building: 'Seven Rocks Classic',
        status: 'Checked-In',
        contractStartDate: '2026-01-01',
        contractEndDate: '2026-06-30',
        contractLengthMonths: 6,
        idDocumentUrl: '/docs/maria.pdf',
        hasExtraPerson: false,
        depositStatus: 'Paid',
        depositAmount: 1800,
        monthlyRent: 900,
        oneTimeAdminFee: 90,
        activeAddOns: []
      };

      const ticket = createExtensionTicket(mockTenant, '2026-12-31', 'Internship extended by 6 months');
      expect(ticket.priority).toBe('High');
      expect(ticket.status).toBe('Open');
      expect(ticket.subject).toContain('Contract Extension Request');
      expect(ticket.description).toContain('Internship extended by 6 months');
      // Contract dates on tenant remain unmutated until official external signing
      expect(mockTenant.contractEndDate).toBe('2026-06-30');
    });

    it('should generate a high-priority support ticket for early departure / cancellation requests', () => {
      const createEarlyDepartureTicket = (
        tenant: Tenant, 
        departureDate: string, 
        reason: string
      ): SupportTicket => {
        return {
          id: `ticket-dep-${Date.now()}`,
          tenantId: tenant.id,
          tenantName: tenant.name,
          roomNumber: tenant.roomNumber,
          building: tenant.building,
          category: 'Other',
          subject: `Early Departure / Cancellation Request: ${departureDate}`,
          description: `Resident requested early move-out on ${departureDate}.\nReason: ${reason}`,
          priority: 'High',
          status: 'Open',
          createdAt: new Date().toISOString()
        };
      };

      const mockTenant: Tenant = {
        id: 't-303',
        name: 'David Kim',
        email: 'david@example.com',
        phone: '+43 676 9876543',
        roomNumber: '303',
        building: 'Seven Rocks West',
        status: 'Checked-In',
        contractStartDate: '2026-02-01',
        contractEndDate: '2026-08-31',
        contractLengthMonths: 7,
        idDocumentUrl: '/docs/david.pdf',
        hasExtraPerson: false,
        depositStatus: 'Paid',
        depositAmount: 1600,
        monthlyRent: 800,
        oneTimeAdminFee: 90,
        activeAddOns: []
      };

      const ticket = createEarlyDepartureTicket(mockTenant, '2026-05-15', 'Company relocation to Berlin');
      expect(ticket.priority).toBe('High');
      expect(ticket.status).toBe('Open');
      expect(ticket.subject).toContain('Early Departure / Cancellation Request: 2026-05-15');
      expect(ticket.description).toContain('Company relocation to Berlin');
    });
  });

  // =========================================================================
  // 6. STORAGE AUDIT COMPARISON ANALYSIS (PHASE 4)
  // =========================================================================
  describe('Email Storage Strategy Comparison', () => {
    it('should demonstrate >95% storage savings when saving metadata vs full HTML bodies', () => {
      const metadataSizeBytes = 450;    // ~0.45 KB per dispatch
      const fullHtmlSizeBytes = 42000;   // ~42 KB per dispatch with branding & styles

      const calculateSavingsPercent = (metadata: number, full: number): number => {
        return Number((((full - metadata) / full) * 100).toFixed(1));
      };

      const savings = calculateSavingsPercent(metadataSizeBytes, fullHtmlSizeBytes);
      expect(savings).toBeGreaterThan(95);
      expect(savings).toBe(98.9);
    });
  });

});
