"use client";
import HousekeepingView from '../../../components/HousekeepingView';
import { useDashboardContext } from '../../../DashboardContext';

export default function HousekeepingPage() {
  const ctx = useDashboardContext();
  return <HousekeepingView {...ctx} />;
}
