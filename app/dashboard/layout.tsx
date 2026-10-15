"use client";
import React, { useState } from 'react';
import { DashboardProvider, useDashboardContext } from '../../DashboardContext';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { usePathname, useRouter } from 'next/navigation';
import { HelpCircle, X } from 'lucide-react';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showQuickPolicyDrawer, setShowQuickPolicyDrawer] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();
  const ctx = useDashboardContext();
  
  const { searchTerm, setSearchTerm } = ctx;
  const activeTab = pathname?.split('/').pop() || 'dashboard';

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    router.push('/');
  };

  const titleMap: Record<string, string> = {
    'dashboard': 'Overview Dashboard',
    'tenants': 'Resident Leasehold Directory',
    'notifications': 'App Alerts Center',
    'addons': 'Add-on Services & Amenities',
    'housekeeping': 'Sanitation & Work Orders',
    'billing': 'Financials & Invoicing',
    'admins': 'Staff & Admin Management',
    'settings': 'Property Settings & Policies'
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden text-slate-800 font-sans">
      
      <Sidebar 
        openTicketsCount={ctx.tickets?.filter((t: any) => t.status !== 'Resolved').length || 0}
        pendingRequestsCount={ctx.addOnRequests?.filter((r: any) => r.status === 'Pending').length || 0}
        onLogout={handleLogout}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        <Header 
          title={titleMap[activeTab] || 'Overview Dashboard'}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onOpenFaq={() => setShowQuickPolicyDrawer(true)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          {/* We provide children context through standard React props where possible, but context is used by views */}
          {children}
        </main>
      </div>

      {showQuickPolicyDrawer && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 flex justify-end backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-96 h-full border-l border-slate-200 p-6 shadow-2xl flex flex-col justify-between animate-slide-left">
            
            <div className="space-y-6 overflow-y-auto pr-1">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="h-5 w-5 text-emerald-600" />
                  <h4 className="font-bold text-slate-800 text-sm">Policies Summary Guide</h4>
                </div>
                <button 
                  onClick={() => setShowQuickPolicyDrawer(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {ctx.policies?.map((p: any) => (
                  <div key={`side-${p.id}`} className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase">
                      {p.category}
                    </span>
                    <h5 className="font-bold text-slate-800 leading-normal">{p.question}</h5>
                    <p className="text-slate-500 leading-relaxed font-medium">{p.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowQuickPolicyDrawer(false);
                  router.push('/dashboard/settings');
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs text-center block transition-colors"
              >
                Launch Policy CMS Manager
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}
