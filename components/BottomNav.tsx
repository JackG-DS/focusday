'use client';

import React from 'react';
import { CheckSquare, Gift, History, Settings } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { ActiveTab } from '@/lib/types';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, todaysTasks, poolTasks } = useTaskContext();

  const uncompletedTodayCount = todaysTasks.filter((t) => !t.completed).length;

  const navItems: { tab: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      tab: 'today',
      label: 'Today',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: uncompletedTodayCount > 0 ? uncompletedTodayCount : undefined,
    },
    {
      tab: 'pool',
      label: 'Bonus Pool',
      icon: <Gift className="w-5 h-5" />,
      badge: poolTasks.length > 0 ? poolTasks.length : undefined,
    },
    {
      tab: 'history',
      label: 'History',
      icon: <History className="w-5 h-5" />,
    },
    {
      tab: 'settings',
      label: 'Sync & Config',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 pb-safe transition-colors">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`relative flex flex-col items-center justify-center w-16 py-1 rounded-2xl transition-all ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] text-[10px] font-extrabold flex items-center justify-center rounded-full px-1 text-white shadow-xs ${
                      item.tab === 'today'
                        ? 'bg-emerald-500'
                        : 'bg-indigo-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
