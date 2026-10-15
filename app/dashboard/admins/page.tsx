"use client";
import AdminsView from '../../../components/AdminsView';
import { useDashboardContext } from '../../../DashboardContext';

export default function AdminsPage() {
  const ctx = useDashboardContext();
  return <AdminsView {...ctx} />;
}
