'use client';

import React from 'react';
import { RefreshCw, Moon, Sun, Laptop, User } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { formatReadableDate } from '@/lib/storage';

export const Header: React.FC = () => {
  const {
    settings,
    updateSettings,
    streakCount,
    isSyncing,
    syncStatus,
    refreshTasks,
    todaysTasks,
    todaysCompletionPercentage,
    setActiveTab,
    authUser,
    currentWeekBountyPool,
    currentWeekRangeLabel,
  } = useTaskContext();

  const completedCount = todaysTasks.filter((t) => t.completed).length;
  const totalCount = todaysTasks.length;

  const toggleTheme = () => {
    if (settings.theme === 'system') updateSettings({ theme: 'light' });
    else if (settings.theme === 'light') updateSettings({ theme: 'dark' });
    else updateSettings({ theme: 'system' });
  };

  const getThemeIcon = () => {
    if (settings.theme === 'light') return <Sun className="w-3.5 h-3.5 text-[#8B5E3C]" />;
    if (settings.theme === 'dark') return <Moon className="w-3.5 h-3.5 text-[#D4A373]" />;
    return <Laptop className="w-3.5 h-3.5 text-[#70685E] dark:text-[#8C8479]" />;
  };

  return (
    <header className="sticky top-0 z-30 bg-[#F7F5F0]/95 dark:bg-[#151413]/95 backdrop-blur-sm border-b border-[#E2DDD5] dark:border-[#2E2A26] transition-colors">
      <div className="max-w-xl mx-auto px-4 py-3.5">
        {/* Top Masthead Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Masthead Title & Date */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <h1 className="font-serif tracking-tight font-bold text-lg sm:text-xl text-[#1F1D1A] dark:text-[#EDE8E1] leading-none">
                BountyList
              </h1>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#70685E] dark:text-[#8C8479] border-l border-[#E2DDD5] dark:border-[#2E2A26] pl-2">
                LEDGER
              </span>
            </div>
            <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479] mt-1 uppercase">
              {formatReadableDate(settings.lastActiveDate)} &middot; STREAK {streakCount}D
            </p>
          </div>

          {/* Right Controls & Running Total Ledger Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* User Profile Pill if Authenticated */}
            {authUser.isAuthenticated && (
              <button
                onClick={() => setActiveTab('settings')}
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] font-mono text-xs tracking-wider max-w-[120px] truncate transition-colors"
                title={`Signed in as ${authUser.email}`}
              >
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate">{authUser.email?.split('@')[0]}</span>
              </button>
            )}

            {/* Running Total Ledger Badge */}
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#FFFDF9] dark:bg-[#1E1C1A] text-[#8B5E3C] dark:text-[#D4A373] tracking-wider hover:border-[#8B5E3C]/50 dark:hover:border-[#D4A373]/50 transition-colors"
              title={`Weekly Bounty Pool (${currentWeekRangeLabel}): $${currentWeekBountyPool.toLocaleString()} — Resets End of Day Sunday`}
            >
              BOUNTY: ${currentWeekBountyPool.toLocaleString()}
            </button>

            {/* Discreet Manual Refresh/Sync Button */}
            <button
              onClick={() => refreshTasks()}
              disabled={isSyncing}
              className={`p-1.5 rounded-md font-mono text-xs transition-colors border flex items-center justify-center ${
                isSyncing
                  ? 'bg-[#FFFDF9] dark:bg-[#1E1C1A] text-[#8B5E3C] dark:text-[#D4A373] border-[#E2DDD5] dark:border-[#2E2A26] cursor-wait'
                  : syncStatus === 'error'
                  ? 'bg-[#FFFDF9] dark:bg-[#1E1C1A] text-[#9E2A2B] dark:text-[#C94A4B] border-[#9E2A2B]/40 dark:border-[#C94A4B]/40'
                  : 'bg-[#FFFDF9] dark:bg-[#1E1C1A] text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] border-[#E2DDD5] dark:border-[#2E2A26]'
              }`}
              title={isSyncing ? 'Checking the telegraph...' : 'Refresh board from cloud'}
              aria-label="Refresh board"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md bg-[#FFFDF9] dark:bg-[#1E1C1A] text-[#70685E] dark:text-[#8C8479] hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] border border-[#E2DDD5] dark:border-[#2E2A26] transition-colors"
              title={`Current theme: ${settings.theme}. Click to change.`}
            >
              {getThemeIcon()}
            </button>
          </div>
        </div>

        {/* Hairline Progress Bar Row */}
        {totalCount > 0 && (
          <div className="mt-3 pt-2.5 border-t border-[#E2DDD5] dark:border-[#2E2A26]">
            <div className="flex items-center justify-between font-mono text-xs tracking-wider mb-1.5 text-[#70685E] dark:text-[#8C8479]">
              <span className="uppercase">
                Resolved: <strong className="text-[#1F1D1A] dark:text-[#EDE8E1]">{completedCount}/{totalCount}</strong>
              </span>
              <span className="text-[#8B5E3C] dark:text-[#D4A373] font-semibold">
                {todaysCompletionPercentage}%
              </span>
            </div>
            <div className="w-full h-1 bg-[#E2DDD5] dark:bg-[#2E2A26] rounded-none overflow-hidden">
              <div
                className="h-full bg-[#8B5E3C] dark:bg-[#D4A373] transition-all duration-500 ease-out"
                style={{ width: `${todaysCompletionPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
