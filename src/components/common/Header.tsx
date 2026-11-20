import React, { useState } from 'react';
import {
  Plane,
  Plus,
  Receipt,
  CreditCard,
  Send,
  Users,
  FileSpreadsheet,
  History,
  Settings,
  Menu,
  X,
  Search,
  Wallet,
  ArrowDownToLine,
  RefreshCw,
  Briefcase,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { NavigationTab } from '../../context/AppContext';

interface HeaderProps {
  onOpenQuickAction: (action: 'voucher' | 'advance' | 'settlement' | 'disbursement' | 'payment' | 'recovery' | 'project') => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenQuickAction }) => {
  const {
    activeTab,
    setActiveTab,
    globalFilter,
    setGlobalFilter,
    vouchers,
    projects,
    linkedSpreadsheetId,
    linkedSpreadsheetTitle,
    setIsGoogleSheetsModalOpen,
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  // Quick stats
  const activeVouchersCount = vouchers.filter(
    (v) => v.overallStatus !== 'Completed' && v.overallStatus !== 'Cancelled'
  ).length;

  const activeProjectsCount = projects.filter((p) => p.status === 'Active').length;

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Receipt className="w-4 h-4" /> },
    { id: 'projects', label: 'Projects', icon: <Briefcase className="w-4 h-4" />, badge: activeProjectsCount },
    { id: 'vouchers', label: 'Travel Vouchers', icon: <Plane className="w-4 h-4" />, badge: activeVouchersCount },
    { id: 'advances', label: 'Advances', icon: <Wallet className="w-4 h-4" /> },
    { id: 'disbursements', label: 'Disbursements', icon: <ArrowDownToLine className="w-4 h-4" /> },
    { id: 'settlements', label: 'Settlements', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'vendorPayments', label: 'Vendor Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'recoveries', label: 'Accounts Recoveries', icon: <Send className="w-4 h-4" /> },
    { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'history', label: 'Activity Log', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleNavClick = (tab: NavigationTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
      {/* Top Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-lg p-1"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-inner shrink-0">
                <Plane className="w-4 h-4 sm:w-5 sm:h-5 -rotate-45" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold tracking-tight text-white block leading-none">
                  TravEase
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 hidden sm:block mt-0.5">
                  Corporate Travel & Fund Control
                </span>
              </div>
            </button>
          </div>

          {/* Search bar in middle on desktop */}
          <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search vouchers, projects, team, advance/settlement IDs..."
                value={globalFilter.search}
                onChange={(e) => setGlobalFilter((prev) => ({ ...prev, search: e.target.value }))}
                className="w-full bg-slate-800/90 text-sm text-slate-200 pl-9 pr-4 py-1.5 rounded-lg border border-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {globalFilter.search && (
                <button
                  onClick={() => setGlobalFilter((prev) => ({ ...prev, search: '' }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Zone 3: Quick Action & Mobile Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Google Sheets Sync Pill */}
            <button
              type="button"
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              className={`flex items-center gap-1 px-2 sm:px-3 py-2 text-xs font-semibold rounded-lg border transition-all min-h-[40px] sm:min-h-[44px] shrink-0 ${
                linkedSpreadsheetId
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-600/60 text-emerald-300 shadow-2xs'
                  : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200'
              }`}
              title={
                linkedSpreadsheetId
                  ? `Connected to: ${linkedSpreadsheetTitle || 'Google Sheet'} · Click to view/sync`
                  : 'Link to Google Sheet for live sync anywhere'
              }
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="hidden md:inline">
                {linkedSpreadsheetId ? 'Google Sheet Synced' : 'Link Google Sheet'}
              </span>
              <span className="hidden sm:inline md:hidden">
                {linkedSpreadsheetId ? 'Sheets' : 'Sheet'}
              </span>
              {linkedSpreadsheetId && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </button>

            {/* Direct Settings Tab Button in Top Header */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-lg border transition-all min-h-[40px] sm:min-h-[44px] shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200'
              }`}
              title="Settings & Data Management (Factory Reset & Data Wipe)"
            >
              <Settings className="w-4 h-4 text-slate-300 shrink-0" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Quick Action Button with dropdown */}
            <div className="relative shrink-0">
              <button
                id="quick-action-btn"
                onClick={() => setQuickMenuOpen(!quickMenuOpen)}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap min-h-[40px] sm:min-h-[44px]"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">New Transaction</span>
                <span className="sm:hidden font-bold">New</span>
              </button>

              {quickMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setQuickMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Quick Record
                    </div>
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onOpenQuickAction('project');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center gap-2.5 min-h-[44px]"
                    >
                      <Briefcase className="w-4 h-4 text-emerald-600" />
                      <span>Add Project</span>
                    </button>
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onOpenQuickAction('voucher');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center gap-2.5 min-h-[44px]"
                    >
                      <Plane className="w-4 h-4 text-indigo-600" />
                      <span>Create Travel Voucher Master Record</span>
                    </button>
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onOpenQuickAction('advance');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center gap-2.5 min-h-[44px]"
                    >
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Raise Advance</span>
                    </button>
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onOpenQuickAction('settlement');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center gap-2.5 min-h-[44px]"
                    >
                      <RefreshCw className="w-4 h-4 text-sky-600" />
                      <span>Record Accounting Settlement</span>
                    </button>
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onOpenQuickAction('disbursement');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center gap-2.5 min-h-[44px]"
                    >
                      <ArrowDownToLine className="w-4 h-4 text-sky-600" />
                      <span>Record Employee Disbursement</span>
                    </button>
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onOpenQuickAction('payment');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center gap-2.5 min-h-[44px]"
                    >
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span>Record Vendor Payment</span>
                    </button>
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onOpenQuickAction('recovery');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center gap-2.5 min-h-[44px]"
                    >
                      <Send className="w-4 h-4 text-violet-600" />
                      <span>Create Accounts Recovery</span>
                    </button>

                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 border border-slate-700/60 bg-slate-800/50"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Secondary Horizontal Navigation Bar */}
        <div className="hidden lg:flex items-center gap-1 border-t border-slate-800/80 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-[38px] ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-sm text-indigo-300'
                    : item.id === 'settings'
                    ? 'text-slate-200 hover:text-white bg-slate-800/40 hover:bg-slate-800/80 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-6 space-y-1 shadow-2xl">
          {/* Mobile search */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vouchers, projects, team..."
              value={globalFilter.search}
              onChange={(e) => setGlobalFilter((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full bg-slate-800 text-sm text-slate-200 pl-9 pr-4 py-2 rounded-lg border border-slate-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium rounded-lg text-left transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
