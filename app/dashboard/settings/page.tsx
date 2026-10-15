"use client";
import SettingsView from '../../../components/SettingsView';
import { useDashboardContext } from '../../../DashboardContext';

export default function SettingsPage() {
  const ctx = useDashboardContext();
  return <SettingsView {...ctx} />;
}
