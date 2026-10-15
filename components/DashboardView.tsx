import { 
  Users, 
  DoorOpen, 
  Wrench, 
  Sparkles, 
  TrendingUp, 
  ArrowRight,
  PlusCircle,
  BellRing,
  ShieldAlert
} from 'lucide-react';
import { Tenant, SupportTicket, AddOnRequest, Invoice, ActivityLog } from '../types';

interface DashboardViewProps {
  tenants: Tenant[];
  tickets: SupportTicket[];
  addOnRequests: AddOnRequest[];
  invoices: Invoice[];
  activityLogs: ActivityLog[];
  onNavigateToTab: (tab: string) => void;
  onOpenQuickAddOn: () => void;
}

export default function DashboardView({ 
  tenants, 
  tickets, 
  addOnRequests, 
  invoices, 
  activityLogs,
  onNavigateToTab,
  onOpenQuickAddOn
}: DashboardViewProps) {
  
  // Calculate stats
  const activeTenants = tenants.filter(t => t.status === 'Checked-In');
  const pendingCheckins = tenants.filter(t => t.status === 'Pending');
  const checkedOutCount = tenants.filter(t => t.status === 'Checked-Out').length;
  
  const openTickets = tickets.filter(t => t.status !== 'Resolved');
  const pendingAddOns = addOnRequests.filter(r => r.status === 'Pending');
  
  // Financial numbers
  const totalRent = activeTenants.reduce((sum, t) => sum + t.monthlyRent, 0);
  const totalAddonRevenue = activeTenants.reduce((sum, t) => {
    // Add active add-on pricing from string patterns (e.g. "€30", "€15", "€68")
    let addonSum = 0;
    t.activeAddOns.forEach(addon => {
      const match = addon.match(/€(\d+)/);
      if (match) addonSum += parseInt(match[1], 10);
    });
    return sum + addonSum;
  }, 0);
  
  // Count total occupancy (assuming 100 rooms capacity)
  const totalRooms = 100;
  const occupiedRooms = activeTenants.length;
  const occupancyPercentage = Math.round((occupiedRooms / totalRooms) * 100);

  // Real-time Property type capacity configuration
  const propertyTypesList = [
    {
      id: 'coliving',
      name: 'Co-Living Suites',
      capacity: 45,
      filter: (t: Tenant) => (t.building?.toLowerCase() || '').includes('co-living') && !(t.roomNumber?.toLowerCase() || '').includes('studio'),
    },
    {
      id: 'apartment',
      name: 'Private Apartments',
      capacity: 35,
      filter: (t: Tenant) => (t.roomNumber?.toLowerCase() || '').includes('apt') && !(t.building?.toLowerCase() || '').includes('co-living'),
    },
    {
      id: 'studio',
      name: 'Compact Studios',
      capacity: 20,
      filter: (t: Tenant) => (t.roomNumber?.toLowerCase() || '').includes('studio'),
    },
  ];

  const occupancyByType = propertyTypesList.map(pt => {
    const activeInType = activeTenants.filter(pt.filter).length;
    const percentage = pt.capacity > 0 ? Math.round((activeInType / pt.capacity) * 100) : 0;
    return {
      ...pt,
      occupied: activeInType,
      percentage: Math.min(percentage, 100),
    };
  });

  // Activity icon mapping
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'tenant': return <Users className="h-4 w-4 text-brand-primary" />;
      case 'billing': return <TrendingUp className="h-4 w-4 text-brand-primary" />;
      case 'ticket': return <Wrench className="h-4 w-4 text-brand-secondary" />;
      case 'notification': return <BellRing className="h-4 w-4 text-brand-stone" />;
      case 'addon': return <Sparkles className="h-4 w-4 text-brand-primary" />;
      default: return <PlusCircle className="h-4 w-4 text-brand-stone" />;
    }
  };

  const getActivityColorClass = (type: string) => {
    return 'bg-brand-surface border-brand-border';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Intro Welcome & Quick Status Banner */}
      <div className="bg-[#5A5A40] rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between shadow-brand border border-[#4A4A33]">
        <div className="space-y-1">
          <h3 className="text-xl font-bold font-serif tracking-tight !text-white">Welcome back, Property Team</h3>
          <p className="text-xs text-[#E5E0D8]/80 font-medium">
            Seven Rocks Portfolio: <span className="font-semibold text-white">2 active complexes</span>. Currently managing {tenants.length} leaseholders.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button 
            onClick={() => onNavigateToTab('notifications')}
            className="px-4 py-2 bg-[#4E4E37]/80 hover:bg-[#4E4E37] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 border border-[#E5E0D8]/20 transition-colors"
          >
            <BellRing className="h-3.5 w-3.5 text-white/90" />
            <span>Broadcast Alert</span>
          </button>
          <button 
            onClick={onOpenQuickAddOn}
            className="px-4 py-2 bg-white text-[#5A5A40] hover:bg-[#F5F5F0] rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-colors border border-[#E5E0D8]"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Process New Request</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Active Tenants */}
        <div 
          onClick={() => onNavigateToTab('tenants')}
          className="bg-white p-6 rounded-2xl border border-natural-border hover:border-natural-orange shadow-xs hover:shadow-lg hover:shadow-natural-orange/5 cursor-pointer transition-all duration-300 ease-in-out hover:-translate-y-1 group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-brand-surface text-brand-primary group-hover:bg-[#E5E0D8] transition-colors border border-brand-border">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[10px] bg-brand-surface text-brand-secondary px-2 py-0.5 rounded-full font-bold border border-brand-border">Leases</span>
          </div>
          <div className="mt-4 space-y-1">
            <h4 className="text-3xl font-serif text-brand-primary">{activeTenants.length}</h4>
            <p className="text-xs text-brand-secondary font-medium">Active checked-in tenants</p>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border flex items-center justify-between text-[11px] text-brand-primary font-semibold">
            <span>Manage directory</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 2: Pending Actions */}
        <div 
          onClick={() => onNavigateToTab('tenants')}
          className="bg-white p-6 rounded-2xl border border-natural-border hover:border-natural-orange shadow-xs hover:shadow-lg hover:shadow-natural-orange/5 cursor-pointer transition-all duration-300 ease-in-out hover:-translate-y-1 group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-brand-surface text-brand-secondary group-hover:bg-[#E5E0D8] transition-colors border border-brand-border">
              <DoorOpen className="h-5 w-5" />
            </div>
            <span className="text-[10px] bg-brand-surface text-brand-stone px-2 py-0.5 rounded-full font-bold border border-brand-border">Transitions</span>
          </div>
          <div className="mt-4 space-y-1">
            <h4 className="text-3xl font-serif text-brand-primary">{pendingCheckins.length}</h4>
            <p className="text-xs text-brand-secondary font-medium">Pending Check-in requests</p>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border flex items-center justify-between text-[11px] text-brand-secondary font-semibold">
            <span>Review checklist</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 3: Support Tickets */}
        <div 
          onClick={() => onNavigateToTab('housekeeping')}
          className="bg-white p-6 rounded-2xl border border-natural-border hover:border-natural-orange shadow-xs hover:shadow-lg hover:shadow-natural-orange/5 cursor-pointer transition-all duration-300 ease-in-out hover:-translate-y-1 group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-brand-surface text-brand-stone group-hover:bg-[#E5E0D8] transition-colors border border-brand-border">
              <Wrench className="h-5 w-5" />
            </div>
            {openTickets.length > 0 ? (
              <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                <ShieldAlert className="h-3 w-3" /> Urgent
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">All Clear</span>
            )}
          </div>
          <div className="mt-4 space-y-1">
            <h4 className="text-3xl font-serif text-brand-primary">{openTickets.length}</h4>
            <p className="text-xs text-brand-secondary font-medium">Open maintenance tickets</p>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border flex items-center justify-between text-[11px] text-brand-primary font-semibold">
            <span>Dispatch engineer</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 4: Add-on Requests */}
        <div 
          onClick={() => onNavigateToTab('addons')}
          className="bg-white p-6 rounded-2xl border border-natural-border hover:border-natural-orange shadow-xs hover:shadow-lg hover:shadow-natural-orange/5 cursor-pointer transition-all duration-300 ease-in-out hover:-translate-y-1 group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-brand-surface text-brand-primary group-hover:bg-[#E5E0D8] transition-colors border border-brand-border">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-[10px] bg-brand-surface text-brand-secondary px-2 py-0.5 rounded-full font-bold border border-brand-border">Upsells</span>
          </div>
          <div className="mt-4 space-y-1">
            <h4 className="text-3xl font-serif text-brand-primary">{pendingAddOns.length}</h4>
            <p className="text-xs text-brand-secondary font-medium">Pending service requests</p>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border flex items-center justify-between text-[11px] text-brand-primary font-semibold">
            <span>Approve services</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Main Section Grid: Occupancy Profile & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Occupancy Breakdown & Quick Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-brand-border shadow-xs">
            <h4 className="font-bold text-brand-dark text-sm mb-4 font-serif">Portfolio Analytics</h4>
            
            {/* Occupancy Radial Indicator */}
            <div className="flex flex-col items-center justify-center p-4 bg-brand-surface border border-brand-border rounded-xl mb-6">
              <div className="relative flex items-center justify-center">
                {/* Simulated circle with simple ring styling */}
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="50" strokeWidth="8" stroke="#E5E0D8" fill="transparent" />
                  <circle 
                    cx="64" 
                    cy="64" 
                    r="50" 
                    strokeWidth="8" 
                    stroke="#5A5A40" 
                    fill="transparent" 
                    strokeDasharray="314"
                    strokeDashoffset={314 - (314 * occupancyPercentage) / 100}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-extrabold text-brand-dark font-mono">{occupancyPercentage}%</span>
                  <span className="text-[10px] font-bold text-brand-stone uppercase tracking-wider">Occupancy</span>
                </div>
              </div>
              <p className="text-xs text-brand-secondary font-medium mt-4 text-center">
                {occupiedRooms} of {totalRooms} rooms allocated. 
              </p>
            </div>

            {/* Real-time Property Type Utilization Visualizer */}
            <div className="mb-6 space-y-3.5 border-t border-brand-border/60 pt-5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-brand-stone uppercase tracking-wider">Utilization by Category</span>
                <span className="inline-flex items-center space-x-1 text-[10px] text-natural-orange font-bold font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-natural-orange animate-pulse" />
                  <span>Real-time</span>
                </span>
              </div>
              
              <div className="space-y-3">
                {occupancyByType.map((type) => (
                  <div 
                    key={type.id} 
                    className="space-y-1.5 bg-brand-bg p-2.5 rounded-xl border border-brand-border hover:border-natural-orange/30 transition-all duration-300 ease-in-out group"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-brand-dark group-hover:text-natural-orange transition-colors">{type.name}</span>
                      <span className="font-bold text-brand-stone font-mono text-[11px]">
                        {type.occupied} <span className="text-brand-secondary/70 font-normal">/ {type.capacity}</span> <span className="text-[10px] text-brand-primary px-1 bg-brand-surface rounded font-bold">{type.percentage}%</span>
                      </span>
                    </div>
                    {/* Progress Bar with modern sleekness */}
                    <div className="w-full bg-brand-surface rounded-full h-1.5 overflow-hidden relative border border-brand-border/40">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          type.id === 'coliving' ? 'bg-natural-olive' : type.id === 'apartment' ? 'bg-natural-orange' : 'bg-natural-sage'
                        }`}
                        style={{ width: `${type.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Financial Overview mini panel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-brand-border text-xs">
                <span className="text-brand-secondary font-medium">Contracted Monthly Rent</span>
                <span className="font-bold text-brand-dark font-mono">€{totalRent.toLocaleString('en-IE', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-brand-border text-xs">
                <span className="text-brand-secondary font-medium">Add-on Contract Revenue</span>
                <span className="font-bold text-brand-primary font-mono">+€{totalAddonRevenue.toLocaleString('en-IE', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-brand-surface text-xs border border-brand-border text-brand-dark">
                <span className="font-semibold">Gross Run-Rate</span>
                <span className="font-extrabold text-brand-primary font-mono">€{(totalRent + totalAddonRevenue).toLocaleString('en-IE', { minimumFractionDigits: 2 })} /mo</span>
              </div>
            </div>
          </div>

          {/* Quick Admin Policy Tips card */}
          <div className="bg-gradient-to-br from-[#5A5A40] to-[#3C3C2A] text-emerald-100 p-6 rounded-2xl border border-[#4A4A33] shadow-xs relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
              <ShieldAlert className="h-32 w-32 text-white" />
            </div>
            <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-2 font-serif">Key Policy Reminders</h5>
            <div className="space-y-3 text-xs leading-relaxed text-[#E5E0D8]/90">
              <p>
                <strong className="text-white">Admin Move-In Fee:</strong> Enforce one-time <strong className="text-white">€90.00</strong> on move-in invoices.
              </p>
              <p>
                <strong className="text-white">Notice Rule:</strong> All housekeepings need <strong className="text-white">24-48 hours</strong> notice. Double-check timestamp of requests.
              </p>
              <p>
                <strong className="text-white">Deposit Rule:</strong> 1.5 months for stays &lt;6mo. 2 months for stays &gt;=6mo. Automatically set in contract extension drawer.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Activity Feed (Span 2) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-xs h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-brand-dark text-sm font-serif">System Activity Feed</h4>
                <p className="text-[11px] text-brand-secondary font-medium">Real-time action log of tenants and staff</p>
              </div>
              <span className="text-[10px] font-bold text-brand-primary bg-brand-surface border border-brand-border px-2.5 py-1 rounded-md">Live Stream Active</span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[380px] pr-2">
              {activityLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start space-x-3.5 p-3 rounded-xl bg-natural-cream/40 border border-natural-border hover:bg-natural-stone/50 hover:border-natural-orange/30 transition-all duration-300 ease-in-out animate-[fadeIn_0.6s_cubic-bezier(0.16,1,0.3,1)_both]"
                >
                  <div className={`p-2 rounded-lg border shrink-0 ${getActivityColorClass(log.type)}`}>
                    {getActivityIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-brand-dark">{log.action}</p>
                      <span className="text-[10px] text-brand-stone font-mono font-medium">
                        {new Date(log.timestamp).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-brand-secondary font-medium">{log.details}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] text-brand-stone font-medium">Triggered by:</span>
                      <span className="text-[10px] bg-brand-surface text-brand-primary border border-brand-border font-semibold px-1.5 py-0.5 rounded font-mono">
                        {log.user}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-brand-border flex justify-end">
              <button 
                onClick={() => onNavigateToTab('tenants')} 
                className="text-xs font-bold text-brand-secondary hover:text-brand-primary flex items-center space-x-1"
              >
                <span>Audit lease directory</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
