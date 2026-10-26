"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BillingView from '../../../components/BillingView';
import { useDashboardContext } from '../../../DashboardContext';
import { FEATURES } from '../../../lib/features';

export default function BillingPage() {
  const router = useRouter();
  const ctx = useDashboardContext();

  useEffect(() => {
    if (!FEATURES.adminBilling) {
      router.replace('/dashboard');
    }
  }, [router]);

  if (!FEATURES.adminBilling) {
    return null;
  }

  return <BillingView {...ctx} />;
}
