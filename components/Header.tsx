import { Search, Calendar, ShieldCheck, HelpCircle, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenFaq: () => void;
  onOpenMobileSidebar?: () => void;
}

export default function Header({ title, searchTerm, setSearchTerm, onOpenFaq, onOpenMobileSidebar }: HeaderProps) {
  // Current metadata date: 2026-07-09
  const formattedDate = "Thursday, July 9, 2026";

  return (
    <header className="h-20 bg-white border-b border-brand-border px-4 md:px-8 flex items-center justify-between shrink-0">
      {/* Left section: Title & Hamburger */}
      <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
        {onOpenMobileSidebar && (
          <button 
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 text-brand-secondary hover:text-brand-primary hover:bg-brand-surface rounded-xl border border-brand-border cursor-pointer shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        
        <h2 className="text-sm md:text-xl font-bold font-serif text-brand-primary tracking-tight truncate">{title}</h2>
        
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-brand-surface text-brand-secondary text-[10px] md:text-xs font-medium border border-brand-border shrink-0">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-primary" />
          <span>Secure SSL</span>
        </div>
      </div>

      {/* Search and Quick Actions */}
      <div className="flex items-center space-x-2 md:space-x-6">
        {/* Search Input */}
        <div className="relative w-32 sm:w-48 md:w-64">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-brand-stone" />
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-brand-bg border border-brand-border rounded-lg text-xs font-medium placeholder-brand-stone focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all text-brand-dark"
          />
        </div>

        {/* Date Display */}
        <div className="hidden md:flex items-center space-x-2 text-brand-secondary">
          <Calendar className="h-4 w-4 text-brand-stone" />
          <span className="text-xs font-semibold font-mono">{formattedDate}</span>
        </div>

        {/* FAQ Quick Link */}
        <button
          onClick={onOpenFaq}
          className="flex items-center space-x-1 px-2.5 py-1.5 md:px-3 bg-brand-surface hover:bg-brand-bg border border-brand-border text-brand-primary rounded-lg text-[10px] md:text-xs font-semibold transition-colors shrink-0"
          title="View Active Policies & FAQ summary"
        >
          <HelpCircle className="h-3.5 w-3.5 text-brand-primary" />
          <span className="hidden sm:inline">Policies & FAQ</span>
        </button>
      </div>
    </header>
  );
}
