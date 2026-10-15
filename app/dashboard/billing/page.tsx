"use client";
import BillingView from '../../../components/BillingView';
import { useDashboardContext } from '../../../DashboardContext';

export default function BillingPage() {
  const ctx = useDashboardContext();
  return <BillingView {...ctx} />;
}
