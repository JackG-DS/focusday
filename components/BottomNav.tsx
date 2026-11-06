'use client';

import React from 'react';
import { CheckSquare, Gift, Repeat, History, Settings } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { ActiveTab } from '@/lib/types';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, todaysTasks, poolTasks, recurringTasks } = useTaskContext();

  const uncompletedTodayCount = todaysTasks.filter((t) => !t.completed).length;

  const navItems: { tab: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      tab: 'today',
      label: 'Board',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: uncompletedTodayCount > 0 ? uncompletedTodayCount : undefined,
    },
    {
      tab: 'pool',
      label: 'Bounties',
      icon: <Gift className="w-4 h-4" />,
      badge: poolTasks.length > 0 ? poolTasks.length : undefined,
    },
    {
      tab: 'recurring',
      label: 'Standing',
      icon: <Repeat className="w-4 h-4" />,
      badge: recurringTasks.length > 0 ? recurringTasks.length : undefined,
    },
    {
      tab: 'history',
      label: 'Ledger',
      icon: <History className="w-4 h-4" />,
    },
    {
      tab: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#F7F5F0]/95 dark:bg-[#151413]/95 backdrop-blur-sm border-t border-[#E2DDD5] dark:border-[#2E2A26] pb-safe transition-colors">
      <div className="max-w-xl mx-auto px-2 sm:px-4 h-14 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
                isActive
                  ? 'text-[#1F1D1A] dark:text-[#EDE8E1] font-semibold'
                  : 'text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1]'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-[#8B5E3C] dark:bg-[#D4A373]" />
              )}
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-3 min-w-[16px] h-[15px] font-mono text-[9px] tracking-wider font-semibold flex items-center justify-center rounded-sm px-1 bg-[#FFFDF9] dark:bg-[#1E1C1A] text-[#8B5E3C] dark:text-[#D4A373] border border-[#E2DDD5] dark:border-[#2E2A26]">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider mt-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
