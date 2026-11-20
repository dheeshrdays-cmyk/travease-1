import React from 'react';
import { LayoutDashboard, Plane, Wallet, Settings, MoreHorizontal } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { NavigationTab } from '../../context/AppContext';

interface BottomTabBarProps {
  onOpenMoreMenu: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ onOpenMoreMenu }) => {
  const { activeTab, setActiveTab, vouchers } = useApp();

  const activeVouchersCount = vouchers.filter(
    (v) => v.overallStatus !== 'Completed' && v.overallStatus !== 'Cancelled'
  ).length;

  const tabs: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'vouchers', label: 'Vouchers', icon: <Plane className="w-5 h-5" />, badge: activeVouchersCount },
    { id: 'advances', label: 'Advances', icon: <Wallet className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pb-safe"
    >
      <div className="grid grid-cols-5 items-center h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors relative ${
                isActive ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-bold bg-indigo-600 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-tight">{tab.label}</span>
              {isActive && (
                <div className="w-6 h-0.5 bg-indigo-600 rounded-full absolute bottom-1.5" />
              )}
            </button>
          );
        })}

        {/* More Options Tab */}
        <button
          onClick={onOpenMoreMenu}
          className="flex flex-col items-center justify-center h-full min-h-[44px] text-slate-500 hover:text-slate-800 transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight leading-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
