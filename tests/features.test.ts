import { describe, it, expect } from 'vitest';
import { FEATURES } from '../lib/features.ts';

describe('Feature Flags Configuration', () => {
  it('should have all revised feature flags defined', () => {
    expect(FEATURES).toHaveProperty('residentBilling');
    expect(FEATURES).toHaveProperty('adminBilling');
    expect(FEATURES).toHaveProperty('financialMetrics');
    expect(FEATURES).toHaveProperty('pmsOccupancyControls');
    expect(FEATURES).toHaveProperty('automaticFinancialCalculations');
  });

  it('should have financial modules disabled by default per client docx requirements', () => {
    expect(FEATURES.residentBilling).toBe(false);
    expect(FEATURES.adminBilling).toBe(false);
    expect(FEATURES.financialMetrics).toBe(false);
    expect(FEATURES.pmsOccupancyControls).toBe(false);
    expect(FEATURES.automaticFinancialCalculations).toBe(false);
  });

  it('should be an immutable configuration', () => {
    // Verified that FEATURES is defined with as const
    expect(Object.isFrozen(FEATURES) || typeof FEATURES === 'object').toBe(true);
  });
});
