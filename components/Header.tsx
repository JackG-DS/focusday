'use client';

import React from 'react';
import { Sparkles, Flame, Cloud, CloudOff, RefreshCw, Moon, Sun, Laptop, User } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { formatReadableDate } from '@/lib/storage';

export const Header: React.FC = () => {
  const {
    settings,
    updateSettings,
    streakCount,
    syncStatus,
    todaysTasks,
    todaysCompletionPercentage,
    setActiveTab,
    authUser,
  } = useTaskContext();

  const completedCount = todaysTasks.filter((t) => t.completed).length;
  const totalCount = todaysTasks.length;

  const toggleTheme = () => {
    if (settings.theme === 'system') updateSettings({ theme: 'light' });
    else if (settings.theme === 'light') updateSettings({ theme: 'dark' });
    else updateSettings({ theme: 'system' });
  };

  const getThemeIcon = () => {
    if (settings.theme === 'light') return <Sun className="w-4 h-4 text-amber-500" />;
    if (settings.theme === 'dark') return <Moon className="w-4 h-4 text-indigo-400" />;
    return <Laptop className="w-4 h-4 text-slate-400" />;
  };

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & App Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-sm shadow-emerald-500/20 text-white font-bold text-lg">
              <Sparkles className="w-5 h-5 text-white animate-pulse-subtle" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  FocusDay
                </h1>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                  PWA
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatReadableDate(settings.lastActiveDate)}
              </p>
            </div>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex items-center gap-1.5">
            {/* User Profile Pill if Authenticated */}
            {authUser.isAuthenticated && (
              <button
                onClick={() => setActiveTab('settings')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-2xs max-w-[130px] truncate"
                title={`Signed in as ${authUser.email}`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{authUser.email?.split('@')[0]}</span>
              </button>
            )}

            {/* Streak Counter */}
            <div 
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs font-semibold shadow-xs"
              title={`${streakCount} day active streak!`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{streakCount}d</span>
            </div>

            {/* Cloud Sync Status */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1 ${
                syncStatus === 'synced'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
                  : syncStatus === 'offline'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  : syncStatus === 'error'
                  ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title={`Cloud status: ${syncStatus}. Click to configure Supabase sync & auth.`}
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : syncStatus === 'offline' ? (
                <CloudOff className="w-3.5 h-3.5" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
              title={`Current theme: ${settings.theme}. Click to change.`}
            >
              {getThemeIcon()}
            </button>
          </div>
        </div>

        {/* Progress Bar Row */}
        {totalCount > 0 && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-xs mb-1 font-medium text-slate-600 dark:text-slate-400">
              <span>
                Today&apos;s Progress: <strong className="text-slate-900 dark:text-white">{completedCount}/{totalCount}</strong>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {todaysCompletionPercentage}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out"
                style={{ width: `${todaysCompletionPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
