/**
 * Feature Flags Configuration for Seven Rocks Platform.
 * 
 * In accordance with client specifications (Web app extras.docx):
 * - Financial screens, resident portal billing, payment ledgers, and PMS-style
 *   occupancy controls are toggled off by default (false).
 * - Code and calculations remain fully intact in the codebase.
 * - To re-enable any feature in the future, simply change its value to true.
 */

export const FEATURES = {
  // --- Resident Portal Features ---
  /**
   * Resident Portal Billing & Invoices
   * When false: Hides the Billing tab, invoice ledger, outstanding balance widgets, and desk invoice modals.
   */
  residentBilling: false,

  // --- Admin Dashboard Features ---
  /**
   * Admin Billing & Invoices View
   * When false: Hides the "Billing & Invoices" navigation item from the Sidebar.
   */
  adminBilling: false,

  /**
   * Dashboard Financial Metrics & PMS Occupancy Charts
   * When false: Hides contracted monthly rent / revenue mini-panels and PMS room capacity graphs.
   */
  financialMetrics: false,
  pmsOccupancyControls: false,

  /**
   * Automatic Deposit & Rent Calculations
   * When false: Omits automatic rent-based deposit calculations.
   */
  automaticFinancialCalculations: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;
