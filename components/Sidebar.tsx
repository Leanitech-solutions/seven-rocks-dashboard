import { 
  LayoutDashboard, 
  Users, 
  BellRing, 
  Sparkles, 
  Brush, 
  Receipt, 
  Settings,
  LogOut,
  Shield,
  X
} from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SevenRocksLogo } from './SevenRocksLogo';
import { useToast } from '../lib/useToast';

// Maps sidebar item IDs to the department key they belong to
const DEPARTMENT_MAP: Record<string, string> = {
  tenants: 'tenants',
  notifications: 'notifications',
  addons: 'addons',
  housekeeping: 'housekeeping',
  billing: 'billing',
};

// Items that are always visible regardless of department
const ALWAYS_VISIBLE = new Set(['dashboard', 'admins', 'settings']);

interface SidebarProps {
  openTicketsCount: number;
  pendingRequestsCount: number;
  onLogout?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ 
  openTicketsCount, 
  pendingRequestsCount, 
  onLogout,
  isOpenMobile,
  onCloseMobile
}: SidebarProps) {
  const { showToast, ToastElement } = useToast();
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState<string>('Seven Rocks Team');
  const [userRole, setUserRole] = useState<string>('');
  const [userDepartment, setUserDepartment] = useState<string[]>([]);

  useEffect(() => {
    // Parse basic info from client cookie for instant display
    try {
      const match = document.cookie.match(/(^| )seven_rocks_user=([^;]+)/);
      if (match) {
        let decoded = match[2];
        try {
          while (decoded !== decodeURIComponent(decoded)) {
            decoded = decodeURIComponent(decoded);
          }
        } catch(e) {}
        
        const user = JSON.parse(decoded);
        if (user && user.email) {
          setAdminEmail(user.email);
        }
        if (user && user.role) {
          setUserRole(user.role);
        }
      }
    } catch (e) {
      console.error('Failed to parse user cookie', e);
    }

    // Fetch fresh department from API (DB is source of truth)
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUserRole(data.user.role || '');
          setUserDepartment(Array.isArray(data.user.department) ? data.user.department : []);
          if (data.user.email) setAdminEmail(data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  const activeTab = pathname?.split('/').pop() || 'dashboard';

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { 
      id: 'notifications', 
      label: 'Notification Center', 
      icon: BellRing 
    },
    { 
      id: 'addons', 
      label: 'Add-on Services', 
      icon: Sparkles,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined
    },
    { 
      id: 'housekeeping', 
      label: 'Housekeeping & Tickets', 
      icon: Brush,
      badge: openTicketsCount > 0 ? openTicketsCount : undefined
    },
    { id: 'billing', label: 'Billing & Invoices', icon: Receipt },
    { id: 'admins', label: 'Staff & Admins', icon: Shield },
    { id: 'settings', label: 'Settings & Policies', icon: Settings },
  ];

  // Filter menu items based on role and department
  const menuItems = allMenuItems.filter(item => {
    // Always show items that don't require department access
    if (ALWAYS_VISIBLE.has(item.id)) return true;
    // Super admins see everything
    if (userRole === 'super_admin') return true;
    // If user has no departments assigned, show nothing restricted
    if (!userDepartment.length) return false;
    // Check if this item's department is in the user's assigned departments
    const requiredDept = DEPARTMENT_MAP[item.id];
    if (!requiredDept) return true;
    return userDepartment.includes(requiredDept);
  });

  const content = (
    <div className="w-full flex flex-col h-full bg-white text-brand-dark">
      {/* Brand Header */}
      <div className="p-8 pb-6 border-b border-brand-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-brand-surface text-brand-primary p-2 rounded-xl flex items-center justify-center border border-brand-border">
            <SevenRocksLogo className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-xl font-serif text-brand-primary leading-tight font-bold">Seven Rocks</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-stone mt-1">Staff Admin Portal</p>
          </div>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="lg:hidden p-2 text-brand-stone hover:text-brand-dark cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id || (activeTab === 'dashboard' && item.id === 'dashboard');
          const href = item.id === 'dashboard' ? '/dashboard' : `/dashboard/${item.id}`;
          return (
            <Link
              key={item.id}
              href={href}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-surface text-brand-primary font-semibold shadow-xs'
                  : 'text-brand-secondary hover:bg-brand-bg hover:text-brand-primary'
              }`}
            >
              <div className="flex items-center space-x-3">
                <IconComponent className={`h-4 w-4 transition-colors ${
                  isActive ? 'text-brand-primary' : 'text-brand-secondary group-hover:text-brand-primary'
                }`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${
                  isActive 
                    ? 'bg-brand-primary text-white' 
                    : 'bg-brand-surface text-brand-primary border border-brand-border'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin Profile Summary Footer */}
      <div className="p-4 border-t border-brand-border bg-brand-bg/50">
        <div className="flex items-center space-x-3 p-2 rounded-lg">
          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-brand-primary text-white flex items-center justify-center border border-brand-primary/30 shadow-xs">
              <Shield className="h-4 w-4 text-emerald-300" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-brand-dark truncate">{userRole === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
            <p className="text-[10px] text-brand-secondary truncate font-mono" title={adminEmail}>{adminEmail}</p>
          </div>
          <button 
            title="Log out"
            className="text-brand-stone hover:text-brand-primary hover:text-rose-700 transition-colors p-1 cursor-pointer"
            onClick={() => {
              if (onLogout) {
                onLogout();
              }
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {ToastElement}
      {/* Desktop Sidebar */}
      <div className="w-64 bg-white text-brand-dark flex flex-col h-screen border-r border-brand-border shrink-0 hidden lg:flex">
        {content}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-64 bg-white h-full shadow-2xl relative flex flex-col animate-slide-left">
            {content}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
}
