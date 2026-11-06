'use client';

import React, { useEffect } from 'react';
import { Header } from '@/components/Header';
import { DailyTaskList, WeeklyBountyLedgerCard } from '@/components/DailyTaskList';
import { TaskInput } from '@/components/TaskInput';
import { PoolManager } from '@/components/PoolManager';
import { RecurringManager } from '@/components/RecurringManager';
import { HistoryView } from '@/components/HistoryView';
import { SettingsModal } from '@/components/SettingsModal';
import { BonusCelebrationModal } from '@/components/BonusCelebrationModal';
import { BottomNav } from '@/components/BottomNav';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';
import { SyncErrorBanner } from '@/components/SyncErrorBanner';
import { TomorrowPreview } from '@/components/TomorrowPreview';
import { useTaskContext } from '@/context/TaskContext';

export default function Home() {
  const { activeTab, settings } = useTaskContext();

  // Apply theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System mode
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  return (
    <main className="min-h-screen flex flex-col justify-between bg-[#F7F5F0] dark:bg-[#151413] text-[#1F1D1A] dark:text-[#EDE8E1] pb-24 transition-colors">
      {/* Sticky Header */}
      <Header />

      {/* Main Container */}
      <div className="flex-1 w-full max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Cloud Sync Offline/Error Fallback Banner */}
        <SyncErrorBanner />

        {/* PWA Install Notification */}
        <PWAInstallBanner />

        {/* Tab 1: Today's Focus */}
        {activeTab === 'today' && (
          <div className="space-y-6 animate-fade-in">
            <TaskInput />
            <DailyTaskList />
            <TomorrowPreview />
            <WeeklyBountyLedgerCard />
          </div>
        )}

        {/* Tab 2: Bonus Task Pool */}
        {activeTab === 'pool' && (
          <div className="animate-fade-in">
            <PoolManager />
          </div>
        )}

        {/* Tab 3: Recurring Tasks Management */}
        {activeTab === 'recurring' && (
          <div className="animate-fade-in">
            <RecurringManager />
          </div>
        )}

        {/* Tab 4: History & Past Logs */}
        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <HistoryView />
          </div>
        )}

        {/* Tab 5: Cloud Sync & Settings */}
        {activeTab === 'settings' && (
          <div className="animate-fade-in">
            <SettingsModal />
          </div>
        )}
      </div>

      {/* Bonus Reward Celebration Modal */}
      <BonusCelebrationModal />

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav />
    </main>
  );
}
