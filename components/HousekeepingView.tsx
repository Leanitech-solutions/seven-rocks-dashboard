import { useState, FormEvent } from 'react';
import { useToast } from '../lib/useToast';
import { formatId } from '../lib/formatId';
import { 
  Brush, 
  Wrench, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2,
  Play,
  Check,
  User,
  MapPin,
  Menu,
  ShieldCheck,
  ArrowRight,
  X,
  BarChart3,
  Layers,
  Filter,
  Building,
  Activity,
  ChevronLeft,
  ChevronRight,
  List,
  Download
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { HousekeepingRequest, SupportTicket, Tenant, TicketStatus } from '../types';

interface HousekeepingViewProps {
  housekeepings: HousekeepingRequest[];
  tickets: SupportTicket[];
  tenants: Tenant[];
  onAddHousekeeping: (req: HousekeepingRequest) => void;
  onUpdateHousekeeping: (id: string, status: HousekeepingRequest['status']) => void;
  onAddTicket: (req: SupportTicket) => void;
  onUpdateTicketStatus: (id: string, status: TicketStatus) => void;
  onAddActivity: (type: 'tenant' | 'billing' | 'addon' | 'ticket' | 'notification', action: string, details: string) => void;
}

export default function HousekeepingView({ 
  housekeepings, 
  tickets, 
  tenants, 
  onAddHousekeeping,
  onUpdateHousekeeping,
  onAddTicket,
  onUpdateTicketStatus,
  onAddActivity
}: HousekeepingViewProps) {
  const { showToast, ToastElement } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'housekeeping' | 'tickets'>('housekeeping');

  // Support Tickets view mode & filter states
  const [ticketsViewMode, setTicketsViewMode] = useState<'kanban' | 'chart'>('kanban');
  const [groupByOption, setGroupByOption] = useState<'priority' | 'status' | 'category'>('priority');
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('All');
  const [showUnresolvedChart, setShowUnresolvedChart] = useState(false);

  // New Housekeeping scheduling states
  const [housekeepingViewMode, setHousekeepingViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(6); // 6 = July (0-indexed)
  const [selectedCalendarTask, setSelectedCalendarTask] = useState<{ type: 'hk' | 'ticket'; data: any } | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newTenantId, setNewTenantId] = useState('');
  const [newFrequency, setNewFrequency] = useState<'Monthly' | 'Bi-Weekly' | 'Single Use'>('Single Use');
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Target date calculated relative: Today is July 9, 2026
  const TODAY_STR = "2026-07-09";

  const [showAddTicketForm, setShowAddTicketForm] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState('Other');
  const [newTicketPriority, setNewTicketPriority] = useState<'Low' | 'Medium' | 'High'>('Low');

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const tenant = tenants.find(t => t.id === newTenantId);
    if (!tenant) return;

    const newTicket: SupportTicket = {
      id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      building: tenant.building,
      subject: newTicketSubject,
      description: newTicketDesc,
      category: newTicketCategory as any,
      priority: newTicketPriority,
      status: 'Open',
      createdAt: new Date().toISOString().split('T')[0]
    };
    onAddTicket(newTicket);
    onAddActivity('ticket', 'Created Ticket', `Admin created a new ${newTicketPriority} priority ticket for ${tenant.name}.`);
    
    setShowAddTicketForm(false);
    setNewTicketSubject('');
    setNewTicketDesc('');
    setNewTicketPriority('Low');
    showToast('Support ticket created successfully.', 'success');
  };

  const handleDownloadHousekeepingCSV = () => {
    const headers = [
      'ID',
      'Resident Name',
      'Room/Suite',
      'Building/Location',
      'Scheduled Date',
      'Requested On',
      'Frequency',
      'Rate/Price (€)',
      'Status',
      'Notes'
    ];

    const rows = housekeepings.map(h => [
      h.id,
      h.tenantName,
      h.roomNumber,
      h.building || '',
      h.scheduleDate,
      h.requestedAt,
      h.frequency,
      h.priceValue,
      h.status,
      h.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => {
        const strVal = val === undefined || val === null ? '' : String(val);
        const escaped = strVal.replace(/"/g, '""');
        return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `housekeeping_cleaning_schedule_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddActivity(
      'addon',
      'Exported Housekeeping Schedule',
      `Admin exported ${housekeepings.length} housekeeping cleaning schedules to a CSV spreadsheet.`
    );
  };

  const handleDownloadTicketsCSV = () => {
    const headers = [
      'ID',
      'Resident Name',
      'Room/Suite',
      'Building/Location',
      'Subject',
      'Description',
      'Category',
      'Priority',
      'Status',
      'Created Date'
    ];

    const rows = tickets.map(t => [
      t.id,
      t.tenantName,
      t.roomNumber,
      t.building || '',
      t.subject,
      t.description,
      t.category,
      t.priority,
      t.status,
      t.createdAt
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => {
        const strVal = val === undefined || val === null ? '' : String(val);
        const escaped = strVal.replace(/"/g, '""');
        return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `maintenance_support_tickets_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddActivity(
      'ticket',
      'Exported Support Tickets',
      `Admin exported ${tickets.length} maintenance support tickets to a CSV spreadsheet.`
    );
  };

  // Helper to calculate hours notice
  const getHoursNotice = (requestedAtStr: string, scheduledDateStr: string): number => {
    const req = new Date(requestedAtStr + "T00:00:00");
    const sch = new Date(scheduledDateStr + "T00:00:00");
    const diffMs = sch.getTime() - req.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  };

  const getNoticeLevelBadge = (requestedAtStr: string, scheduledDateStr: string) => {
    const hours = getHoursNotice(requestedAtStr, scheduledDateStr);
    if (hours >= 48) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-brand-surface text-brand-primary border border-brand-border px-2 py-0.5 rounded-full font-bold">
          <ShieldCheck className="h-3 w-3" /> OK (&gt;48h notice)
        </span>
      );
    } else if (hours >= 24) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-brand-surface text-brand-stone border border-brand-border px-2 py-0.5 rounded-full font-bold">
          <ShieldCheck className="h-3 w-3" /> OK (24-48h notice)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full font-bold animate-pulse">
          <AlertTriangle className="h-3 w-3 text-rose-600" /> Violates 24h Policy
        </span>
      );
    }
  };

  // Calendar variables & helpers
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (y: number, m: number) => {
    return new Date(y, m, 1).getDay();
  };

  const getDayDateString = (day: number) => {
    const m = String(calendarMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${calendarYear}-${m}-${d}`;
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const getCalendarCells = () => {
    const cells = [];
    
    // Days from previous month
    const prevMonthYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
    const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
    const prevMonthDays = getDaysInMonth(prevMonthYear, prevMonth);
    const firstDayIdx = getFirstDayOfMonth(calendarYear, calendarMonth);
    
    for (let i = firstDayIdx - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const mStr = String(prevMonth + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      cells.push({
        day: dayNum,
        dateString: `${prevMonthYear}-${mStr}-${dStr}`,
        isCurrentMonth: false,
      });
    }
    
    // Days from current month
    const daysInCurrMonth = getDaysInMonth(calendarYear, calendarMonth);
    for (let i = 1; i <= daysInCurrMonth; i++) {
      const mStr = String(calendarMonth + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      cells.push({
        day: i,
        dateString: `${calendarYear}-${mStr}-${dStr}`,
        isCurrentMonth: true,
      });
    }
    
    // Days from next month
    const nextMonthYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
    const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
    const remainingCells = 42 - cells.length;
    for (let i = 1; i <= remainingCells; i++) {
      const mStr = String(nextMonth + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      cells.push({
        day: i,
        dateString: `${nextMonthYear}-${mStr}-${dStr}`,
        isCurrentMonth: false,
      });
    }
    
    return cells;
  };

  // Pricing helper
  const getCleaningPrice = (freq: 'Monthly' | 'Bi-Weekly' | 'Single Use') => {
    if (freq === 'Monthly') return 140.00;
    if (freq === 'Bi-Weekly') return 120.00;
    return 40.00;
  };

  // Submit new cleaning schedule
  const handleScheduleCleaning = (e: FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      showToast('Please select a clean date.', 'error');
      return;
    }

    const tenant = tenants.find(t => t.id === newTenantId);
    if (!tenant) return;

    // Check notice condition in real-time
    const hours = getHoursNotice(TODAY_STR, newDate);
    const price = getCleaningPrice(newFrequency);

    const newRequest: HousekeepingRequest = {
      id: `HKP-${Math.floor(300 + Math.random() * 900)}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      building: tenant.building,
      scheduleDate: newDate,
      requestedAt: TODAY_STR,
      frequency: newFrequency,
      priceValue: price,
      status: 'Scheduled',
      notes: newNotes
    };

    onAddHousekeeping(newRequest);
    onAddActivity(
      'addon',
      'Scheduled Housekeeping Service',
      `Booked ${newFrequency} clean (€${price}) for ${tenant.name} on ${newDate}. Notice provided: ${hours} hours.`
    );

    // Reset
    setShowScheduleForm(false);
    setNewFrequency('Single Use');
    setNewDate('');
    setNewNotes('');
    showToast('Cleaning session dispatched to workflow.', 'success');

    // Highlight violation alert to user if necessary
    if (hours < 24) {
      showToast('Policy Note: This request was booked with less than 24 hours advance notice. Housekeeping dispatch has been flagged for override validation.', 'warning');
    }
  };

  // Support ticket priority badges
  const getPriorityBadge = (priority: 'Low' | 'Medium' | 'High') => {
    switch (priority) {
      case 'High': return 'bg-rose-50 text-rose-800 border-rose-200 font-extrabold';
      case 'Medium': return 'bg-amber-50 text-amber-800 border-amber-200';
      default: return 'bg-brand-bg text-brand-secondary border-brand-border';
    }
  };

  // Filter lists
  const kanbanOpen = tickets.filter(t => t.status === 'Open');
  const kanbanProgress = tickets.filter(t => t.status === 'In Progress');
  const kanbanResolved = tickets.filter(t => t.status === 'Resolved');

  // Support Tickets visualizer calculations
  const unresolvedTickets = tickets.filter(t => t.status !== 'Resolved');

  const uniqueBuildings = Array.from(
    new Set([
      ...tenants.map(t => t.building),
      ...tickets.map(t => t.building)
    ])
  ).filter(Boolean);

  const totalUnresolved = unresolvedTickets.length;
  const resolvedTicketsCount = tickets.filter(t => t.status === 'Resolved').length;
  const totalTicketsCount = tickets.length;
  const highPriorityCount = unresolvedTickets.filter(t => t.priority === 'High').length;
  const openCount = unresolvedTickets.filter(t => t.status === 'Open').length;
  const inProgressCount = unresolvedTickets.filter(t => t.status === 'In Progress').length;

  let highestIncidentBuilding = 'None';
  let maxTicketsCount = 0;
  uniqueBuildings.forEach(b => {
    const count = unresolvedTickets.filter(t => t.building === b).length;
    if (count > maxTicketsCount) {
      maxTicketsCount = count;
      highestIncidentBuilding = b;
    }
  });

  const chartData = uniqueBuildings.map(building => {
    const buildingTickets = unresolvedTickets.filter(t => t.building === building);
    
    const filteredBuildingTickets = buildingTickets.filter(t => {
      const matchCategory = selectedCategoryFilter === 'All' || t.category === selectedCategoryFilter;
      const matchPriority = selectedPriorityFilter === 'All' || t.priority === selectedPriorityFilter;
      return matchCategory && matchPriority;
    });

    const dataObj: any = {
      building,
      shortBuilding: building.length > 18 ? building.substring(0, 15) + '...' : building,
      total: filteredBuildingTickets.length,
    };

    if (groupByOption === 'priority') {
      dataObj.High = filteredBuildingTickets.filter(t => t.priority === 'High').length;
      dataObj.Medium = filteredBuildingTickets.filter(t => t.priority === 'Medium').length;
      dataObj.Low = filteredBuildingTickets.filter(t => t.priority === 'Low').length;
    } else if (groupByOption === 'status') {
      dataObj.Open = filteredBuildingTickets.filter(t => t.status === 'Open').length;
      dataObj['In Progress'] = filteredBuildingTickets.filter(t => t.status === 'In Progress').length;
    } else {
      dataObj.Plumbing = filteredBuildingTickets.filter(t => t.category === 'Plumbing').length;
      dataObj.Electrical = filteredBuildingTickets.filter(t => t.category === 'Electrical').length;
      dataObj['Internet/Wi-Fi'] = filteredBuildingTickets.filter(t => t.category === 'Internet/Wi-Fi').length;
      dataObj.Appliance = filteredBuildingTickets.filter(t => t.category === 'Appliance').length;
      dataObj['Key/Access'] = filteredBuildingTickets.filter(t => t.category === 'Key/Access').length;
      dataObj.Other = filteredBuildingTickets.filter(t => t.category === 'Other').length;
    }

    return dataObj;
  });

  const detailedTickets = unresolvedTickets.filter(t => {
    const matchBuilding = selectedBuilding === null || t.building === selectedBuilding;
    const matchCategory = selectedCategoryFilter === 'All' || t.category === selectedCategoryFilter;
    const matchPriority = selectedPriorityFilter === 'All' || t.priority === selectedPriorityFilter;
    return matchBuilding && matchCategory && matchPriority;
  });

  const categoryCounts = {
    Plumbing: unresolvedTickets.filter(t => t.category === 'Plumbing').length,
    Electrical: unresolvedTickets.filter(t => t.category === 'Electrical').length,
    'Internet/Wi-Fi': unresolvedTickets.filter(t => t.category === 'Internet/Wi-Fi').length,
    Appliance: unresolvedTickets.filter(t => t.category === 'Appliance').length,
    'Key/Access': unresolvedTickets.filter(t => t.category === 'Key/Access').length,
    Other: unresolvedTickets.filter(t => t.category === 'Other').length,
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-[11px] font-medium space-y-1.5">
          <p className="font-bold text-xs text-[#E5E0D8] font-serif italic">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-300 font-semibold">{entry.name}:</span>
                <span className="text-white font-bold">{entry.value}</span>
              </div>
            ))}
          </div>
          <div className="pt-1.5 border-t border-slate-700 text-slate-400 font-bold flex justify-between gap-4">
            <span>Total:</span>
            <span className="text-[#F9F8F6]">
              {payload.reduce((acc: number, entry: any) => acc + (entry.value || 0), 0)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {ToastElement}
      
      {/* Navigation Subtabs */}
      <div className="bg-white p-4 rounded-2xl border border-brand-border flex items-center justify-between">
        <div className="flex space-x-1.5">
          <button
            onClick={() => setActiveSubTab('housekeeping')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'housekeeping'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'bg-brand-surface text-brand-secondary border border-brand-border hover:bg-[#E5E0D8]'
            }`}
          >
            <Brush className="h-4 w-4" />
            <span>Housekeeping Schedule</span>
          </button>
          <button
            onClick={() => setActiveSubTab('tickets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === 'tickets'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'bg-brand-surface text-brand-secondary border border-brand-border hover:bg-[#E5E0D8]'
            }`}
          >
            <Wrench className="h-4 w-4" />
            <span>Maintenance Tickets Board</span>
          </button>
        </div>

        {activeSubTab === 'housekeeping' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHousekeepingCSV}
              className="px-3 py-1.5 bg-brand-surface hover:bg-[#E5E0D8] text-brand-primary border border-brand-border rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              title="Download housekeeping schedule in CSV format"
            >
              <Download className="h-3.5 w-3.5 text-natural-orange" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setShowScheduleForm(true)}
              className="px-3 py-1.5 bg-brand-primary hover:bg-[#4E4E37] text-white text-xs font-bold rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Book Cleaning Service</span>
            </button>
          </div>
        )}

        {activeSubTab === 'tickets' && (
          <button
            onClick={handleDownloadTicketsCSV}
            className="px-3 py-1.5 bg-brand-surface hover:bg-[#E5E0D8] text-brand-primary border border-brand-border rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
            title="Download support tickets in CSV format"
          >
            <Download className="h-3.5 w-3.5 text-natural-orange" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* SUB-MODULE 1: Housekeeping Schedule */}
      {activeSubTab === 'housekeeping' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-xs">
            <div className="p-6 border-b border-brand-border flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-brand-surface">
              <div>
                <h4 className="font-bold text-brand-dark text-sm font-serif italic">Room Cleaning & Maintenance</h4>
                <p className="text-[10px] text-brand-stone font-medium">Tracking professional housekeeping requests and facility tasks</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-brand-secondary">
                <div className="flex gap-3 text-[10px] font-bold text-brand-secondary">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-brand-stone" />
                    <span>Monthly: €140</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-brand-stone" />
                    <span>Bi-Weekly: €120</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-brand-stone" />
                    <span>Single Clean: €40</span>
                  </div>
                </div>

                <div className="flex p-0.5 bg-white border border-brand-border rounded-lg shadow-2xs">
                  <button
                    onClick={() => setHousekeepingViewMode('list')}
                    className={`px-3 py-1 text-xs font-bold rounded-md flex items-center space-x-1.5 transition-all cursor-pointer ${
                      housekeepingViewMode === 'list'
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'text-brand-stone hover:text-brand-secondary hover:bg-brand-surface'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>List View</span>
                  </button>
                  <button
                    onClick={() => setHousekeepingViewMode('calendar')}
                    className={`px-3 py-1 text-xs font-bold rounded-md flex items-center space-x-1.5 transition-all cursor-pointer ${
                      housekeepingViewMode === 'calendar'
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'text-brand-stone hover:text-brand-secondary hover:bg-brand-surface'
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Calendar View</span>
                  </button>
                </div>
              </div>
            </div>

            {housekeepingViewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-brand-surface border-b border-brand-border">
                      <th className="px-6 py-4 text-xs font-bold text-brand-stone uppercase tracking-wider font-serif italic">Resident / Suite</th>
                      <th className="px-6 py-4 text-xs font-bold text-brand-stone uppercase tracking-wider font-serif italic">Scheduled Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-brand-stone uppercase tracking-wider font-serif italic">Requested On</th>
                      <th className="px-6 py-4 text-xs font-bold text-brand-stone uppercase tracking-wider font-serif italic">Notice Check (24-48h Rule)</th>
                      <th className="px-6 py-4 text-xs font-bold text-brand-stone uppercase tracking-wider font-serif italic">Frequency / Rate</th>
                      <th className="px-6 py-4 text-xs font-bold text-brand-stone uppercase tracking-wider font-serif italic">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-brand-stone uppercase tracking-wider font-serif italic">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border text-xs">
                    {housekeepings.map((h) => (
                      <tr key={h.id} className="hover:bg-brand-surface/40 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-brand-dark">{h.tenantName}</p>
                          <p className="text-[10px] text-brand-stone font-semibold">{h.roomNumber} ({h.building})</p>
                        </td>
                        <td className="px-6 py-4 font-bold text-brand-dark font-mono">
                          {h.scheduleDate}
                        </td>
                        <td className="px-6 py-4 text-brand-stone font-mono">
                          {h.requestedAt}
                        </td>
                        <td className="px-6 py-4">
                          {getNoticeLevelBadge(h.requestedAt, h.scheduleDate)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-brand-dark">{h.frequency}</p>
                          <p className="text-[10px] text-brand-stone font-semibold tracking-wider font-mono">€{h.priceValue}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-brand-border ${
                            h.status === 'Scheduled'
                              ? 'bg-brand-surface text-brand-stone'
                              : h.status === 'In Progress'
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : h.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {h.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {h.status === 'Scheduled' && (
                              <>
                                <button
                                  onClick={() => {
                                    onUpdateHousekeeping(h.id, 'In Progress');
                                    onAddActivity('addon', 'Housekeeping Approved', `Cleaning approved/started for ${h.tenantName} in ${h.roomNumber}.`);
                                  }}
                                  className="p-1 text-amber-600 hover:bg-amber-50 rounded border border-brand-border cursor-pointer"
                                  title="Approve / Start Job"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    onUpdateHousekeeping(h.id, 'Cancelled');
                                    onAddActivity('addon', 'Housekeeping Cancelled', `Cleaning cancelled for ${h.tenantName}.`);
                                  }}
                                  className="p-1 text-rose-700 hover:bg-rose-50 rounded border border-brand-border cursor-pointer"
                                  title="Cancel Job"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            
                            {h.status === 'In Progress' && (
                              <>
                                <button
                                  onClick={() => {
                                    onUpdateHousekeeping(h.id, 'Completed');
                                    onAddActivity('addon', 'Housekeeping Complete', `Clean completed for ${h.tenantName} in ${h.roomNumber}.`);
                                  }}
                                  className="p-1 text-brand-primary hover:bg-brand-surface rounded border border-brand-border cursor-pointer"
                                  title="Complete Job"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    onUpdateHousekeeping(h.id, 'Cancelled');
                                    onAddActivity('addon', 'Housekeeping Cancelled', `Cleaning cancelled for ${h.tenantName}.`);
                                  }}
                                  className="p-1 text-rose-700 hover:bg-rose-50 rounded border border-brand-border cursor-pointer"
                                  title="Cancel Job"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 space-y-4 overflow-x-auto">
                {/* Calendar Navigation & Month Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-brand-border pb-4 min-w-[750px]">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 hover:bg-brand-surface border border-brand-border rounded-lg transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4 text-brand-secondary" />
                    </button>
                    <h3 className="text-sm font-extrabold text-brand-dark font-serif italic min-w-[140px] text-center">
                      {MONTHS[calendarMonth]} {calendarYear}
                    </h3>
                    <button
                      onClick={handleNextMonth}
                      className="p-1.5 hover:bg-brand-surface border border-brand-border rounded-lg transition-colors cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4 text-brand-secondary" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[10px]">
                    <button
                      onClick={() => {
                        setCalendarYear(2026);
                        setCalendarMonth(6); // July
                      }}
                      className="px-2.5 py-1 bg-brand-surface border border-brand-border text-brand-primary font-bold rounded-md hover:bg-[#E5E0D8] cursor-pointer"
                    >
                      Current Month (July '26)
                    </button>
                    <div className="flex items-center gap-3 font-semibold text-brand-secondary">
                      <div className="flex items-center space-x-1">
                        <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-300 rounded" />
                        <span>Scheduled Cleanings</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2.5 h-2.5 bg-amber-100 border border-amber-300 rounded" />
                        <span>Maintenance Tickets</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calendar Grid Header */}
                <div className="grid grid-cols-7 gap-1 text-center font-serif italic text-brand-stone text-xs font-bold py-1.5 bg-brand-surface rounded-lg border border-brand-border/40 min-w-[750px]">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1.5 min-w-[750px]">
                  {getCalendarCells().map((cell, idx) => {
                    const cellHousekeeping = housekeepings.filter(h => h.scheduleDate === cell.dateString);
                    const cellTickets = tickets.filter(t => t.createdAt === cell.dateString);
                    const isToday = cell.dateString === TODAY_STR;
                    const totalTasks = cellHousekeeping.length + cellTickets.length;
                    const isHighLoad = totalTasks >= 3;

                    return (
                      <div
                        key={idx}
                        className={`min-h-[110px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                          cell.isCurrentMonth
                            ? isToday
                              ? 'bg-brand-surface/75 border-brand-primary shadow-xs ring-1 ring-brand-primary/50'
                              : isHighLoad
                              ? 'bg-amber-50/20 border-amber-200 hover:bg-amber-50/40'
                              : 'bg-white border-brand-border hover:bg-brand-surface/20'
                            : 'bg-slate-50/40 border-slate-100 text-slate-300'
                        }`}
                      >
                        {/* Day number & Load indicator */}
                        <div className="flex items-center justify-between pb-1 border-b border-dashed border-brand-border/40">
                          <span className={`text-[11px] font-bold font-mono ${
                            cell.isCurrentMonth 
                              ? isToday 
                                ? 'text-brand-primary font-extrabold bg-white px-1.5 py-0.5 rounded-md border border-brand-border' 
                                : 'text-brand-dark' 
                              : 'text-slate-300'
                          }`}>
                            {cell.day}
                          </span>
                          {cell.isCurrentMonth && isHighLoad && (
                            <span className="text-[8px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wider scale-95" title="High volume day">
                              Busy
                            </span>
                          )}
                          {cell.isCurrentMonth && isToday && (
                            <span className="text-[8px] font-extrabold text-brand-primary uppercase tracking-widest scale-95">
                              Today
                            </span>
                          )}
                        </div>

                        {/* Event Stack */}
                        <div className="flex-1 overflow-y-auto space-y-1 pt-1 max-h-[75px] scrollbar-thin">
                          {cellHousekeeping.map(hk => (
                            <div
                              key={hk.id}
                              onClick={() => setSelectedCalendarTask({ type: 'hk', data: hk })}
                              className={`p-1 text-[9px] rounded-lg border flex items-center justify-between font-medium cursor-pointer transition-colors ${
                                hk.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100'
                                  : hk.status === 'Cancelled'
                                  ? 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                  : 'bg-emerald-50/60 text-brand-dark border-emerald-200 hover:bg-emerald-50'
                              }`}
                              title={`${hk.tenantName} (${hk.roomNumber}) - ${hk.frequency}`}
                            >
                              <span className="truncate max-w-[85%] font-semibold text-left">🧹 {hk.tenantName.split(' ')[0]} ({hk.roomNumber})</span>
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${hk.status === 'Completed' ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                            </div>
                          ))}

                          {cellTickets.map(ticket => (
                            <div
                              key={ticket.id}
                              onClick={() => setSelectedCalendarTask({ type: 'ticket', data: ticket })}
                              className={`p-1 text-[9px] rounded-lg border flex items-center justify-between font-medium cursor-pointer transition-colors ${
                                ticket.status === 'Resolved'
                                  ? 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                  : ticket.priority === 'High'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              }`}
                              title={`🔧 [${ticket.priority}] ${ticket.subject} (${ticket.roomNumber})`}
                            >
                              <span className="truncate max-w-[85%] font-semibold text-left">🔧 {ticket.subject} ({ticket.roomNumber})</span>
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                ticket.status === 'Resolved'
                                  ? 'bg-slate-400'
                                  : ticket.priority === 'High'
                                  ? 'bg-rose-600'
                                  : 'bg-amber-500'
                              }`} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add New Ticket Modal */}
      {showAddTicketForm && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-brand-border bg-brand-surface">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-brand-dark text-lg font-serif italic">New Support Ticket</h3>
                  <p className="text-[11px] text-brand-stone font-medium mt-1">Create a maintenance request for a resident</p>
                </div>
                <button 
                  onClick={() => setShowAddTicketForm(false)}
                  className="p-1.5 bg-white border border-brand-border text-brand-stone hover:text-brand-dark hover:border-brand-stone rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-stone uppercase tracking-wider">Select Resident / Suite</label>
                <select
                  value={newTenantId}
                  onChange={(e) => setNewTenantId(e.target.value)}
                  className="w-full p-2.5 bg-brand-surface border border-brand-border rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 appearance-none transition-all cursor-pointer"
                >
                  <option value="" disabled>-- Select Resident --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} - Suite {t.roomNumber} ({t.building})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-stone uppercase tracking-wider">Issue Category</label>
                <select
                  value={newTicketCategory}
                  onChange={(e) => setNewTicketCategory(e.target.value)}
                  className="w-full p-2.5 bg-brand-surface border border-brand-border rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 appearance-none transition-all cursor-pointer"
                >
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Internet/Wi-Fi">Internet/Wi-Fi</option>
                  <option value="Appliance">Appliance</option>
                  <option value="Key/Access">Key/Access</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-stone uppercase tracking-wider">Priority Level</label>
                <div className="flex gap-3">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTicketPriority(p as any)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newTicketPriority === p 
                          ? p === 'High' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : p === 'Medium' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-brand-primary text-white border-brand-primary shadow-md'
                          : 'bg-white text-brand-stone border-brand-border hover:border-brand-stone'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-stone uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Leaking sink in bathroom"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  className="w-full p-2.5 bg-brand-surface border border-brand-border rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all placeholder:text-brand-stone/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-stone uppercase tracking-wider">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the issue in detail..."
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  className="w-full p-2.5 bg-brand-surface border border-brand-border rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all placeholder:text-brand-stone/60 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-brand-dark text-white rounded-xl text-xs font-bold hover:bg-black transition-colors shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Popup Modal from Calendar */}
      {selectedCalendarTask && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  selectedCalendarTask.type === 'hk' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {selectedCalendarTask.type === 'hk' ? 'Housekeeping Task' : 'Maintenance Ticket'}
                </span>
                <h3 className="font-bold text-brand-dark text-base mt-2 font-serif italic">
                  {selectedCalendarTask.type === 'hk' 
                    ? `Cleaning for Suite ${selectedCalendarTask.data.roomNumber}` 
                    : selectedCalendarTask.data.subject}
                </h3>
                <p className="text-[11px] text-brand-stone font-medium">Room: {selectedCalendarTask.data.roomNumber} ({selectedCalendarTask.data.building})</p>
              </div>
              <button 
                onClick={() => setSelectedCalendarTask(null)}
                className="p-1 text-brand-stone hover:text-brand-dark rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-brand-surface rounded-xl border border-brand-border">
                <div>
                  <p className="text-[10px] font-bold text-brand-stone uppercase tracking-wider">Resident</p>
                  <p className="font-semibold text-brand-dark">{selectedCalendarTask.data.tenantName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-brand-stone uppercase tracking-wider">Date</p>
                  <p className="font-semibold text-brand-dark font-mono">
                    {selectedCalendarTask.type === 'hk' ? selectedCalendarTask.data.scheduleDate : selectedCalendarTask.data.createdAt}
                  </p>
                </div>
              </div>

              {selectedCalendarTask.type === 'hk' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-brand-stone font-bold uppercase tracking-wider">Frequency</p>
                      <p className="font-semibold text-brand-dark">{selectedCalendarTask.data.frequency}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-brand-stone font-bold uppercase tracking-wider">Estimated Price</p>
                      <p className="font-bold text-brand-primary font-mono">€{selectedCalendarTask.data.priceValue.toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-stone font-bold uppercase tracking-wider">Notice Check</p>
                    <p className="mt-1">{getNoticeLevelBadge(selectedCalendarTask.data.requestedAt, selectedCalendarTask.data.scheduleDate)}</p>
                  </div>
                  {selectedCalendarTask.data.notes && (
                    <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600 border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Notes</p>
                      <p className="font-medium mt-0.5">{selectedCalendarTask.data.notes}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-brand-border flex justify-end space-x-2">
                    {selectedCalendarTask.data.status === 'Scheduled' && (
                      <>
                        <button
                          onClick={() => {
                            onUpdateHousekeeping(selectedCalendarTask.data.id, 'Cancelled');
                            onAddActivity('addon', 'Housekeeping Cancelled', `Cleaning cancelled for ${selectedCalendarTask.data.tenantName}.`);
                            setSelectedCalendarTask(null);
                          }}
                          className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Cancel Cleaning
                        </button>
                        <button
                          onClick={() => {
                            onUpdateHousekeeping(selectedCalendarTask.data.id, 'Completed');
                            onAddActivity('addon', 'Housekeeping Complete', `Clean completed for ${selectedCalendarTask.data.tenantName} in ${selectedCalendarTask.data.roomNumber}.`);
                            setSelectedCalendarTask(null);
                          }}
                          className="px-3 py-1.5 bg-brand-primary hover:bg-[#4E4E37] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Complete Cleaning
                        </button>
                      </>
                    )}
                    {selectedCalendarTask.data.status !== 'Scheduled' && (
                      <span className="text-[11px] text-brand-stone font-bold">
                        Job status: <span className="text-brand-primary">{selectedCalendarTask.data.status}</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-brand-stone font-bold uppercase tracking-wider">Category</p>
                      <p className="font-semibold text-brand-dark">{selectedCalendarTask.data.category}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-brand-stone font-bold uppercase tracking-wider">Priority</p>
                      <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold ${
                        selectedCalendarTask.data.priority === 'High' 
                          ? 'bg-rose-100 text-rose-800' 
                          : selectedCalendarTask.data.priority === 'Medium' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {selectedCalendarTask.data.priority}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg text-slate-600 border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Issue Description</p>
                    <p className="font-medium mt-0.5">{selectedCalendarTask.data.description}</p>
                  </div>

                  <div className="pt-4 border-t border-brand-border flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-brand-stone font-bold uppercase">Current Status</p>
                      <p className="font-bold text-brand-primary">{selectedCalendarTask.data.status}</p>
                    </div>
                    <div className="flex space-x-1.5">
                      {selectedCalendarTask.data.status !== 'Resolved' && (
                        <>
                          {selectedCalendarTask.data.status === 'Open' && (
                            <button
                              onClick={() => {
                                onUpdateTicketStatus(selectedCalendarTask.data.id, 'In Progress');
                                onAddActivity('ticket', 'Ticket Dispatch', `Ticket for ${selectedCalendarTask.data.tenantName} set to In Progress.`);
                                setSelectedCalendarTask(null);
                              }}
                              className="px-2.5 py-1.5 bg-amber-600 text-white text-[10px] font-bold rounded-lg hover:bg-amber-700 cursor-pointer"
                            >
                              Start Working
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onUpdateTicketStatus(selectedCalendarTask.data.id, 'Resolved');
                              onAddActivity('ticket', 'Ticket Resolved', `Ticket for ${selectedCalendarTask.data.tenantName} successfully marked Resolved.`);
                              setSelectedCalendarTask(null);
                            }}
                            className="px-2.5 py-1.5 bg-brand-primary text-white text-[10px] font-bold rounded-lg hover:bg-[#4E4E37] cursor-pointer"
                          >
                            Resolve Ticket
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODULE 2: Support Tickets Board */}
      {activeSubTab === 'tickets' && (
        <div className="space-y-6">
          
          {/* Dashboard Header and View Switcher */}
          <div className="bg-white p-4 rounded-2xl border border-brand-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
            <div>
              <h4 className="font-bold text-brand-dark text-sm font-serif italic">Maintenance Analytics & Dispatch</h4>
              <p className="text-[10px] text-brand-stone font-medium">Manage and optimize property incidents via agile Kanban lanes or interactive density charts</p>
            </div>
            
            <div className="flex bg-brand-surface p-1 rounded-xl border border-brand-border self-start sm:self-auto flex-wrap gap-1">
              <button
                onClick={() => setTicketsViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  ticketsViewMode === 'kanban'
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-transparent text-brand-secondary hover:text-brand-dark'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Kanban Board</span>
              </button>

              <button
                onClick={() => setTicketsViewMode('chart')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  ticketsViewMode === 'chart'
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-transparent text-brand-secondary hover:text-brand-dark'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Status Dashboard</span>
              </button>
              <button
                onClick={() => setShowAddTicketForm(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer bg-brand-primary text-white shadow-xs ml-2 hover:bg-[#4E4E37]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Ticket</span>
              </button>
            </div>
          </div>

          {/* Unresolved Tickets Location Chart Toggle Panel */}
          <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-brand-surface text-brand-primary border border-brand-border rounded-xl shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h5 className="font-bold text-brand-dark text-xs font-serif italic">Unresolved Incident Density Visualizer</h5>
                <p className="text-[10px] text-brand-stone font-medium">Toggle unresolved ticket metrics categorized by building overlay</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 self-end sm:self-auto">
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${showUnresolvedChart ? 'text-brand-primary' : 'text-brand-stone'}`}>
                {showUnresolvedChart ? 'Visual Distribution ON' : 'Visual Distribution OFF'}
              </span>
              
              <button
                type="button"
                id="unresolved-tickets-toggle"
                onClick={() => setShowUnresolvedChart(!showUnresolvedChart)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showUnresolvedChart ? 'bg-brand-primary' : 'bg-[#E5E0D8]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    showUnresolvedChart ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Location-based Distribution Chart (Categorized by Building) */}
          {showUnresolvedChart && (
            <div className="bg-white p-5 rounded-2xl border border-brand-border shadow-xs space-y-4 animate-scale-up">
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                  <h4 className="font-bold text-brand-dark text-xs uppercase tracking-wider font-serif italic">Unresolved Ticket Density by Building</h4>
                  <p className="text-[10px] text-[#8C857B]">Interactive spatial analysis of unresolved complaints per physical infrastructure site</p>
                </div>
                
                <div className="flex items-center space-x-1.5 bg-brand-surface px-2.5 py-1 rounded-lg border border-brand-border text-[9px] font-bold text-brand-secondary font-mono">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>{totalUnresolved} Unresolved Tickets</span>
                </div>
              </div>

              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D8" />
                    <XAxis 
                      dataKey="shortBuilding" 
                      tick={{ fill: '#7C7C5A', fontSize: 9, fontWeight: 'bold' }}
                      axisLine={{ stroke: '#E5E0D8' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#7C7C5A', fontSize: 9, fontWeight: 'bold' }}
                      axisLine={{ stroke: '#E5E0D8' }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F2EFE9', opacity: 0.4 }} />
                    <Legend 
                      verticalAlign="top" 
                      height={24} 
                      iconType="circle"
                      iconSize={6}
                      wrapperStyle={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'capitalize' }}
                    />
                    <Bar dataKey="High" name="High Priority" stackId="unresolved" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Medium" name="Medium Priority" stackId="unresolved" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Low" name="Low Priority" stackId="unresolved" fill="#7C7C5A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {ticketsViewMode === 'kanban' ? (
            /* Kanban Agile Board View */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1: Open */}
              <div className="bg-brand-surface rounded-2xl border border-brand-border p-4 flex flex-col min-h-[480px]">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-brand-border">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    <h4 className="font-bold text-brand-dark text-xs uppercase tracking-wider font-serif italic">Unassigned / Open</h4>
                  </div>
                  <span className="text-[10px] bg-brand-bg text-brand-stone border border-brand-border font-extrabold px-2 py-0.5 rounded-full">
                    {kanbanOpen.length}
                  </span>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px]">
                  {kanbanOpen.length === 0 ? (
                    <div className="text-center py-12 text-brand-stone text-xs italic">
                      No open tickets.
                    </div>
                  ) : (
                    kanbanOpen.map((ticket) => (
                      <div key={ticket.id} className="bg-white p-4 rounded-xl border border-brand-border shadow-xs space-y-3 hover:shadow-sm transition-all duration-200">
                        <div className="flex justify-between items-start">
                          <span className={`px-2 py-0.5 text-[9px] rounded-md font-extrabold border uppercase ${getPriorityBadge(ticket.priority)}`}>
                            {ticket.priority} priority
                          </span>
                          <span className="text-[9px] text-brand-stone font-mono font-bold">{formatId(ticket.id)}</span>
                        </div>

                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-brand-dark leading-normal font-serif italic">{ticket.subject}</h5>
                          <p className="text-[11px] text-brand-secondary leading-normal font-medium">{ticket.description}</p>
                        </div>

                        <div className="pt-2 border-t border-brand-border space-y-1.5 text-[10px] text-brand-stone font-medium">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-brand-stone" />
                            <span className="text-brand-dark font-semibold">{ticket.tenantName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-brand-stone" />
                            <span>{ticket.roomNumber} ({ticket.building})</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onUpdateTicketStatus(ticket.id, 'In Progress');
                            onAddActivity('ticket', 'Assigned Support Ticket', `Ticket ${ticket.id} set to In Progress.`);
                          }}
                          className="w-full py-1.5 bg-brand-surface hover:bg-[#E5E0D8] border border-brand-border text-brand-secondary font-bold rounded-lg text-[10px] flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Play className="h-3 w-3 text-brand-primary animate-pulse" />
                          <span>Start Work / Assign</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: In Progress */}
              <div className="bg-brand-surface rounded-2xl border border-brand-border p-4 flex flex-col min-h-[480px]">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-brand-border">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <h4 className="font-bold text-brand-dark text-xs uppercase tracking-wider font-serif italic">Active Progress</h4>
                  </div>
                  <span className="text-[10px] bg-brand-bg text-brand-stone border border-brand-border font-extrabold px-2 py-0.5 rounded-full">
                    {kanbanProgress.length}
                  </span>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px]">
                  {kanbanProgress.length === 0 ? (
                    <div className="text-center py-12 text-brand-stone text-xs italic">
                      No active work orders.
                    </div>
                  ) : (
                    kanbanProgress.map((ticket) => (
                      <div key={ticket.id} className="bg-white p-4 rounded-xl border border-brand-border shadow-xs space-y-3 hover:shadow-sm transition-all duration-200">
                        <div className="flex justify-between items-start">
                          <span className={`px-2 py-0.5 text-[9px] rounded-md font-extrabold border uppercase ${getPriorityBadge(ticket.priority)}`}>
                            {ticket.priority} priority
                          </span>
                          <span className="text-[9px] text-brand-stone font-mono font-bold">{formatId(ticket.id)}</span>
                        </div>

                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-brand-dark leading-normal font-serif italic">{ticket.subject}</h5>
                          <p className="text-[11px] text-brand-secondary leading-normal font-medium">{ticket.description}</p>
                        </div>

                        <div className="pt-2 border-t border-brand-border space-y-1.5 text-[10px] text-brand-stone font-medium">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-brand-stone" />
                            <span className="text-brand-dark font-semibold">{ticket.tenantName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-brand-stone" />
                            <span>{ticket.roomNumber} ({ticket.building})</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onUpdateTicketStatus(ticket.id, 'Resolved');
                            onAddActivity('ticket', 'Resolved Support Ticket', `Ticket ${ticket.id} set to Resolved.`);
                          }}
                          className="w-full py-1.5 bg-brand-primary hover:bg-[#4E4E37] text-white font-bold rounded-lg text-[10px] flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Check className="h-3 w-3" />
                          <span>Complete & Resolve</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Resolved */}
              <div className="bg-brand-surface rounded-2xl border border-brand-border p-4 flex flex-col min-h-[480px]">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-brand-border">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                    <h4 className="font-bold text-brand-dark text-xs uppercase tracking-wider font-serif italic">Resolved logs</h4>
                  </div>
                  <span className="text-[10px] bg-brand-bg text-brand-stone border border-brand-border font-extrabold px-2 py-0.5 rounded-full">
                    {kanbanResolved.length}
                  </span>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px]">
                  {kanbanResolved.length === 0 ? (
                    <div className="text-center py-12 text-brand-stone text-xs italic">
                      No resolved tickets recorded.
                    </div>
                  ) : (
                    kanbanResolved.map((ticket) => (
                      <div key={ticket.id} className="bg-white/80 p-4 rounded-xl border border-brand-border shadow-xs space-y-3 opacity-75">
                        <div className="flex justify-between items-start">
                          <span className="bg-brand-surface text-brand-primary border border-brand-border px-2 py-0.5 text-[9px] rounded font-bold uppercase">
                            Resolved
                          </span>
                          <span className="text-[9px] text-brand-stone font-mono font-bold">{formatId(ticket.id)}</span>
                        </div>

                        <div className="space-y-0.5">
                          <h5 className="text-xs font-bold text-brand-stone line-through leading-normal">{ticket.subject}</h5>
                          <p className="text-[10px] text-brand-stone leading-normal">{ticket.description}</p>
                        </div>

                        <div className="pt-2 border-t border-brand-border flex items-center justify-between text-[10px] text-brand-stone font-medium">
                          <span>Resident: {ticket.tenantName}</span>
                          <span className="text-brand-primary flex items-center gap-0.5 font-bold">
                            <CheckCircle2 className="h-3 w-3" /> Closed
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* Status Dashboard */
            <div className="space-y-6">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs flex items-center space-x-3.5">
                  <div className="p-2.5 bg-brand-surface text-brand-primary rounded-xl border border-brand-border">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-stone font-bold uppercase tracking-wider">Total Tickets</p>
                    <h5 className="text-lg font-bold text-brand-dark font-mono">{totalTicketsCount}</h5>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs flex items-center space-x-3.5">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-stone font-bold uppercase tracking-wider">Resolved Tickets</p>
                    <h5 className="text-lg font-bold text-brand-dark font-mono">{resolvedTicketsCount}</h5>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs flex items-center space-x-3.5">
                  <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-100">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-stone font-bold uppercase tracking-wider">Unresolved Tickets</p>
                    <h5 className="text-lg font-bold text-brand-dark font-mono">{totalUnresolved}</h5>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-xs flex items-center space-x-3.5">
                  <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-stone font-bold uppercase tracking-wider">Critical Tickets</p>
                    <h5 className="text-lg font-bold text-brand-dark font-mono">{highPriorityCount}</h5>
                  </div>
                </div>



              </div>

              {/* Main Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visualizer & Listings (Left) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Chart Card */}
                  <div className="bg-white p-5 rounded-2xl border border-brand-border shadow-xs space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-brand-border pb-3.5">
                      <div>
                        <h4 className="font-bold text-brand-dark text-xs uppercase tracking-wider font-sans">Incident Density by Building</h4>
                        <p className="text-[10px] text-brand-stone">Click on a building's bar or sidebar card to view localized ticket details</p>
                      </div>
                      
                      {/* Controls inside Chart header */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-brand-stone uppercase tracking-wider whitespace-nowrap">Stack by:</span>
                        <div className="bg-brand-surface p-0.5 rounded-lg border border-brand-border flex">
                          {['priority', 'status', 'category'].map((option) => (
                            <button
                              key={option}
                              onClick={() => setGroupByOption(option as any)}
                              className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                                groupByOption === option
                                  ? 'bg-brand-primary text-white'
                                  : 'text-brand-stone hover:text-brand-dark'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Filters Panel */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-brand-surface/60 p-3 rounded-xl border border-brand-border">
                      <div className="flex items-center space-x-2">
                        <Filter className="h-3.5 w-3.5 text-brand-stone shrink-0" />
                        <span className="text-[10px] font-bold text-brand-stone uppercase tracking-wider shrink-0">Category:</span>
                        <select
                          value={selectedCategoryFilter}
                          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                          className="w-full text-xs font-semibold text-brand-dark bg-white border border-brand-border rounded-lg p-1.5 focus:outline-none"
                        >
                          <option value="All">All Categories</option>
                          <option value="Plumbing">Plumbing</option>
                          <option value="Electrical">Electrical</option>
                          <option value="Internet/Wi-Fi">Internet/Wi-Fi</option>
                          <option value="Appliance">Appliance</option>
                          <option value="Key/Access">Key/Access</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Filter className="h-3.5 w-3.5 text-brand-stone shrink-0" />
                        <span className="text-[10px] font-bold text-brand-stone uppercase tracking-wider shrink-0">Priority:</span>
                        <select
                          value={selectedPriorityFilter}
                          onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                          className="w-full text-xs font-semibold text-brand-dark bg-white border border-brand-border rounded-lg p-1.5 focus:outline-none"
                        >
                          <option value="All">All Priorities</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </div>

                    {/* Chart Frame */}
                    <div className="pt-2">
                      {totalUnresolved === 0 ? (
                        <div className="h-[280px] flex flex-col items-center justify-center text-brand-stone italic space-y-2 bg-brand-surface rounded-xl border border-dashed border-brand-border">
                          <CheckCircle2 className="h-8 w-8 text-brand-primary" />
                          <p className="text-xs">All support tickets have been successfully resolved!</p>
                        </div>
                      ) : (
                        <div className="h-[285px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={chartData}
                              margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                              onClick={(state: any) => {
                                const s = state as any;
                                if (s && s.activePayload && s.activePayload.length > 0) {
                                  const clickedBuilding = s.activePayload[0].payload.building;
                                  setSelectedBuilding(selectedBuilding === clickedBuilding ? null : clickedBuilding);
                                }
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D8" />
                              <XAxis 
                                dataKey="shortBuilding" 
                                tick={{ fill: '#7C7C5A', fontSize: 9, fontWeight: 'bold' }}
                                axisLine={{ stroke: '#E5E0D8' }}
                                tickLine={false}
                              />
                              <YAxis 
                                tick={{ fill: '#7C7C5A', fontSize: 9, fontWeight: 'bold' }}
                                axisLine={{ stroke: '#E5E0D8' }}
                                tickLine={false}
                                allowDecimals={false}
                              />
                              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F2EFE9', opacity: 0.4 }} />
                              <Legend 
                                verticalAlign="top" 
                                height={36} 
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'capitalize', color: '#5A5A40' }}
                              />
                              
                              {groupByOption === 'priority' && (
                                <>
                                  <Bar dataKey="High" name="High Priority" stackId="a" fill="#F43F5E" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                                  <Bar dataKey="Medium" name="Medium Priority" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                                  <Bar dataKey="Low" name="Low Priority" stackId="a" fill="#7C7C5A" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                                </>
                              )}
                              {groupByOption === 'status' && (
                                <>
                                  <Bar dataKey="Open" name="Open / Unassigned" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                                  <Bar dataKey="In Progress" name="In Progress" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                                </>
                              )}
                              {groupByOption === 'category' && (
                                <>
                                  <Bar dataKey="Plumbing" name="Plumbing" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                                  <Bar dataKey="Electrical" name="Electrical" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                                  <Bar dataKey="Internet/Wi-Fi" name="Internet/Wi-Fi" stackId="a" fill="#8B5CF6" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                                  <Bar dataKey="Appliance" name="Appliance" stackId="a" fill="#EC4899" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                                  <Bar dataKey="Key/Access" name="Key/Access" stackId="a" fill="#D97706" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                                  <Bar dataKey="Other" name="Other" stackId="a" fill="#6B7280" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                                </>
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Filter Indicators */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] font-semibold text-brand-stone bg-brand-surface p-2.5 rounded-xl border border-brand-border">
                      <div className="flex items-center space-x-1.5">
                        <span>Active Building Filter:</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          selectedBuilding 
                            ? 'bg-brand-primary text-white' 
                            : 'bg-brand-bg text-brand-secondary border border-brand-border'
                        }`}>
                          {selectedBuilding || 'All Buildings'}
                        </span>
                      </div>
                      
                      {selectedBuilding && (
                        <button
                          onClick={() => setSelectedBuilding(null)}
                          className="text-rose-700 hover:text-rose-900 font-extrabold uppercase tracking-wider text-[10px] cursor-pointer"
                        >
                          Clear Building Filter
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detailed Interactive Ticket Work Orders */}
                  <div className="bg-white p-5 rounded-2xl border border-brand-border shadow-xs space-y-4">
                    <div className="flex justify-between items-center border-b border-brand-border pb-3.5">
                      <div>
                        <h4 className="font-bold text-brand-dark text-xs uppercase tracking-wider font-sans">
                          Localized Work Order Queue
                        </h4>
                        <p className="text-[10px] text-brand-stone">Matching tickets with real-time status controls</p>
                      </div>
                      <span className="text-[10px] bg-brand-bg text-brand-stone border border-brand-border px-2 py-0.5 rounded-full font-bold">
                        {detailedTickets.length} matching
                      </span>
                    </div>

                    <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                      {detailedTickets.length === 0 ? (
                        <div className="text-center py-12 text-brand-stone text-xs italic">
                          No unresolved tickets match your active combination of location, category, and priority.
                        </div>
                      ) : (
                        detailedTickets.map((ticket) => (
                          <div key={ticket.id} className="bg-brand-surface/40 p-4 rounded-xl border border-brand-border shadow-2xs space-y-3 hover:bg-brand-surface/80 transition-colors">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border/60 pb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-[9px] text-brand-stone font-mono font-bold">{formatId(ticket.id)}</span>
                                <span className={`px-2 py-0.5 text-[9px] rounded-md font-extrabold border uppercase ${getPriorityBadge(ticket.priority)}`}>
                                  {ticket.priority} priority
                                </span>
                                <span className="bg-brand-bg text-brand-stone px-2 py-0.5 rounded text-[9px] border border-brand-border font-bold uppercase tracking-wider">
                                  {ticket.category}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                                ticket.status === 'Open'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {ticket.status}
                              </span>
                            </div>

                            <div>
                              <h5 className="text-xs font-bold text-brand-dark leading-normal font-serif">{ticket.subject}</h5>
                              <p className="text-[11px] text-brand-secondary leading-normal font-medium mt-1">{ticket.description}</p>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-brand-border/60 text-[10px] text-brand-stone font-medium">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-brand-stone shrink-0" />
                                  <span className="text-brand-dark font-semibold">{ticket.tenantName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-brand-stone shrink-0" />
                                  <span>Suite {ticket.roomNumber} ({ticket.building})</span>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {ticket.status === 'Open' ? (
                                  <button
                                    onClick={() => {
                                      onUpdateTicketStatus(ticket.id, 'In Progress');
                                      onAddActivity('ticket', 'Assigned Support Ticket', `Ticket ${ticket.id} set to In Progress.`);
                                    }}
                                    className="px-3 py-1.5 bg-brand-surface hover:bg-[#E5E0D8] border border-brand-border text-brand-secondary font-bold rounded-lg text-[10px] flex items-center space-x-1 cursor-pointer w-full sm:w-auto"
                                  >
                                    <Play className="h-3 w-3 text-brand-primary animate-pulse" />
                                    <span>Assign & Start Work</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      onUpdateTicketStatus(ticket.id, 'Resolved');
                                      onAddActivity('ticket', 'Resolved Support Ticket', `Ticket ${ticket.id} set to Resolved.`);
                                    }}
                                    className="px-3 py-1.5 bg-brand-primary hover:bg-[#4E4E37] text-white font-bold rounded-lg text-[10px] flex items-center space-x-1 cursor-pointer w-full sm:w-auto"
                                  >
                                    <Check className="h-3 w-3" />
                                    <span>Resolve Ticket</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

                {/* Sidebar Metrics and Filtering (Right) */}
                <div className="space-y-6">
                  
                  {/* Building Selectors list */}
                  <div className="bg-white p-5 rounded-2xl border border-brand-border shadow-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-brand-dark text-xs uppercase tracking-wider font-sans">Buildings Directory</h4>
                      <p className="text-[10px] text-brand-stone">Filter by selecting individual complexes</p>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedBuilding(null)}
                        className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedBuilding === null
                            ? 'bg-brand-surface border-brand-primary text-brand-dark font-bold shadow-xs'
                            : 'bg-white border-brand-border text-brand-stone hover:bg-brand-surface/40'
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="truncate font-semibold">All Property Complexes</span>
                          <span className="font-mono bg-brand-bg px-2 py-0.5 rounded text-[10px] font-bold border border-brand-border text-brand-secondary">
                            {unresolvedTickets.length}
                          </span>
                        </div>
                      </button>

                      {uniqueBuildings.map((building) => {
                        const count = unresolvedTickets.filter(t => t.building === building).length;
                        const isSelected = selectedBuilding === building;
                        return (
                          <button
                            key={building}
                            onClick={() => setSelectedBuilding(building)}
                            className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-brand-surface border-brand-primary text-brand-dark font-bold shadow-xs'
                                : 'bg-white border-brand-border text-brand-stone hover:bg-brand-surface/40'
                            }`}
                          >
                            <div className="flex justify-between items-center text-xs gap-3">
                              <span className="truncate font-semibold" title={building}>{building}</span>
                              <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isSelected 
                                  ? 'bg-brand-primary text-white border-brand-primary' 
                                  : count > 0 
                                  ? 'bg-rose-50 text-rose-800 border-rose-100' 
                                  : 'bg-brand-surface text-brand-stone border-brand-border'
                              }`}>
                                {count}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category density with miniature progress indicators */}
                  <div className="bg-white p-5 rounded-2xl border border-brand-border shadow-xs space-y-4">
                    <div>
                      <h4 className="font-bold text-brand-dark text-xs uppercase tracking-wider font-sans">Category Incidence</h4>
                      <p className="text-[10px] text-brand-stone">Breakdown of active incidents by utility classification</p>
                    </div>

                    <div className="space-y-3.5 pt-1.5">
                      {Object.entries(categoryCounts).map(([cat, count]) => {
                        const pct = totalUnresolved > 0 ? (count / totalUnresolved) * 100 : 0;
                        const isCatSelected = selectedCategoryFilter === cat;
                        return (
                          <div 
                            key={cat} 
                            onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === cat ? 'All' : cat)}
                            className={`space-y-1.5 cursor-pointer p-1.5 rounded-lg transition-colors ${
                              isCatSelected ? 'bg-brand-surface' : 'hover:bg-brand-surface/20'
                            }`}
                            title={`Toggle filter for ${cat}`}
                          >
                            <div className="flex justify-between text-[11px] font-semibold text-brand-dark">
                              <span className={`flex items-center gap-1 ${isCatSelected ? 'text-brand-primary font-bold' : ''}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  cat === 'Plumbing' ? 'bg-blue-500' :
                                  cat === 'Electrical' ? 'bg-emerald-500' :
                                  cat === 'Internet/Wi-Fi' ? 'bg-violet-500' :
                                  cat === 'Appliance' ? 'bg-pink-500' :
                                  cat === 'Key/Access' ? 'bg-amber-500' : 'bg-gray-500'
                                }`} />
                                {cat}
                              </span>
                              <span className="font-mono text-[10px] text-brand-stone">
                                {count} ({Math.round(pct)}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  cat === 'Plumbing' ? 'bg-blue-500' :
                                  cat === 'Electrical' ? 'bg-emerald-500' :
                                  cat === 'Internet/Wi-Fi' ? 'bg-violet-500' :
                                  cat === 'Appliance' ? 'bg-pink-500' :
                                  cat === 'Key/Access' ? 'bg-amber-500' : 'bg-gray-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* Housekeeping Scheduling Modal Dialog */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-brand-border max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-brand-dark text-base font-serif">Schedule Cleaning Dispatch</h3>
                <p className="text-xs text-brand-stone">Book in-house professional cleaning services</p>
              </div>
              <button 
                onClick={() => setShowScheduleForm(false)}
                className="text-brand-stone hover:text-brand-dark cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleCleaning} className="space-y-4 text-xs">
              
              {/* Resident selector */}
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">Select Room Leaseholder</label>
                <select
                  value={newTenantId}
                  onChange={(e) => setNewTenantId(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="" disabled>-- Select Resident --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.roomNumber} - {t.building})</option>
                  ))}
                </select>
              </div>

              {/* Pricing & Frequency */}
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">Cleaning Interval & Rates</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Single Use', label: 'Single Use', desc: '€40.00/use' },
                    { id: 'Bi-Weekly', label: 'Bi-Weekly', desc: '€120.00/Mo' },
                    { id: 'Monthly', label: 'Monthly', desc: '€140.00/Mo' }
                  ].map((freq) => {
                    const isSelected = newFrequency === freq.id;
                    return (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => setNewFrequency(freq.id as any)}
                        className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-brand-primary border-brand-primary text-white shadow-sm'
                            : 'bg-white border-brand-border text-brand-secondary hover:bg-brand-bg'
                        }`}
                      >
                        <span>{freq.label}</span>
                        <span className={`text-[10px] font-semibold font-mono ${isSelected ? 'text-brand-surface' : 'text-brand-primary'}`}>{freq.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cleaning Date */}
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">Cleaning Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                
                {/* Notice warning verification */}
                {newDate && (
                  <div className="mt-2 text-[10px] leading-relaxed">
                    {getHoursNotice(TODAY_STR, newDate) < 24 ? (
                      <p className="text-rose-800 font-bold flex items-center gap-1 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                        <AlertTriangle className="h-3.5 w-3.5" /> Notice is less than 24h! Rule requires 24 to 48 hours advance notice. This booking will trigger a compliance override.
                      </p>
                    ) : (
                      <p className="text-brand-primary font-bold flex items-center gap-1 bg-brand-surface border border-brand-border p-2 rounded-lg font-sans">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Notice rule satisfied. ({getHoursNotice(TODAY_STR, newDate)} hours notice given).
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block font-bold text-brand-stone">Cleaning Instructions / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Allergen-free vacuum, clean room only"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary leading-relaxed placeholder-brand-stone/60"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="flex-1 py-2.5 bg-brand-surface hover:bg-brand-bg border border-brand-border text-brand-secondary rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-primary hover:bg-[#4E4E37] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Authorize Schedule
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
