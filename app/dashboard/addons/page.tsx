"use client";
import AddOnsView from '../../../components/AddOnsView';
import { useDashboardContext } from '../../../DashboardContext';

export default function AddonsPage() {
  const ctx = useDashboardContext();
  return <AddOnsView {...ctx} />;
}
