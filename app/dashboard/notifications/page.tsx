"use client";
import NotificationsView from '../../../components/NotificationsView';
import { useDashboardContext } from '../../../DashboardContext';

export default function NotificationsPage() {
  const ctx = useDashboardContext();
  return <NotificationsView {...ctx} />;
}
