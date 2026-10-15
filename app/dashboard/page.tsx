"use client";
import DashboardView from '../../components/DashboardView';
import { useDashboardContext } from '../../DashboardContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const ctx = useDashboardContext();
  const router = useRouter();

  const handleNavigateToTab = (tab: string) => {
    router.push(`/dashboard/${tab}`);
  };

  const handleOpenQuickAddOn = () => {
    router.push('/dashboard/addons');
  };

  return (
    <DashboardView 
      {...ctx} 
      onNavigateToTab={handleNavigateToTab}
      onOpenQuickAddOn={handleOpenQuickAddOn}
    />
  );
}
