'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Download,
  Code2,
  Copy,
  Check,
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import { SupabaseConfig } from '@/lib/types';
import { getLocalDateString } from '@/lib/dateUtils';
import { AuthCard } from './AuthCard';

export const SettingsModal: React.FC = () => {
  const {
    supabaseConfig,
    updateSupabaseConfig,
    isSyncing,
    syncStatus,
    refreshTasks,
    settings,
    updateSettings,
    clearAllLocalData,
    dailyTasks,
    poolTasks,
  } = useTaskContext();

  const [url, setUrl] = useState(supabaseConfig.url || '');
  const [anonKey, setAnonKey] = useState(supabaseConfig.anonKey || '');
  const [enabled, setEnabled] = useState(supabaseConfig.enabled);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      enabled: enabled && Boolean(url.trim() && anonKey.trim()),
    };
    await updateSupabaseConfig(newConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportData = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      dailyTasks,
      poolTasks,
      settings,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `bountylist-backup-${getLocalDateString()}.json`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const schemaSQL = `-- 1. Create Daily Tasks Table
create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  notes text,
  color text,
  completed boolean not null default false,
  order_index integer not null default 0,
  date_assigned date not null default current_date,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. Create Bonus Pool Tasks Table
create table if not exists public.pool_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  notes text,
  color text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 3. Create Recurring Tasks Table
create table if not exists public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  notes text,
  color text,
  frequency text not null check (frequency in ('daily', 'weekly')),
  day_of_week integer check (day_of_week between 0 and 6),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 4. Create User Settings Table
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  reset_time text not null default '04:00',
  last_reset_date date,
  day_ended_date date,
  updated_at timestamptz not null default timezone('utc'::text, now())
);`;

  const copySql = () => {
    navigator.clipboard.writeText(schemaSQL);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="space-y-5 pb-12 animate-fade-in">
      {/* Page Title */}
      <div className="border-b border-[#E2DDD5] dark:border-[#2E2A26] pb-3">
        <h2 className="font-serif tracking-tight font-bold text-lg sm:text-xl text-[#1F1D1A] dark:text-[#EDE8E1]">
          Settings &amp; Telegraph Sync
        </h2>
        <p className="text-xs sm:text-sm text-[#70685E] dark:text-[#8C8479] mt-0.5">
          Manage cloud database synchronization, credentials, and ledger preferences.
        </p>
      </div>

      {/* Supabase User Authentication Card */}
      <AuthCard />

      {/* Cloud Sync Config Card */}
      <div className="p-4 sm:p-5 rounded-lg bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif tracking-tight font-bold text-sm sm:text-base text-[#1F1D1A] dark:text-[#EDE8E1]">
              Supabase Cloud Sync
            </h3>
            <p className="text-xs text-[#70685E] dark:text-[#8C8479] mt-0.5">
              Synchronize ledger entries across devices.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`font-mono text-xs tracking-wider uppercase px-2.5 py-1 rounded border transition-colors ${
              enabled
                ? 'bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] border-[#1F1D1A] dark:border-[#EDE8E1] font-semibold'
                : 'bg-[#F7F5F0] dark:bg-[#151413] text-[#70685E] dark:text-[#8C8479] border-[#E2DDD5] dark:border-[#2E2A26]'
            }`}
          >
            {enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center justify-between p-2.5 bg-[#F7F5F0] dark:bg-[#151413] border border-[#E2DDD5] dark:border-[#2E2A26] rounded font-mono text-xs tracking-wider">
          <div className="flex items-center gap-2">
            <span className="text-[#70685E] dark:text-[#8C8479] uppercase">Status:</span>
            <span
              className={`font-semibold flex items-center gap-1 ${
                isSyncing
                  ? 'text-[#8B5E3C] dark:text-[#D4A373]'
                  : syncStatus === 'synced'
                  ? 'text-[#1F1D1A] dark:text-[#EDE8E1]'
                  : syncStatus === 'error'
                  ? 'text-[#9E2A2B] dark:text-[#C94A4B]'
                  : 'text-[#70685E] dark:text-[#8C8479]'
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : syncStatus === 'synced' ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : syncStatus === 'error' ? (
                <AlertCircle className="w-3 h-3" />
              ) : null}
              {isSyncing ? 'SYNCING...' : syncStatus.toUpperCase()}
            </span>
          </div>

          {enabled && (
            <button
              onClick={() => refreshTasks()}
              disabled={isSyncing}
              className="px-2.5 py-1 font-mono text-xs uppercase tracking-wider bg-[#FFFDF9] dark:bg-[#1E1C1A] text-[#1F1D1A] dark:text-[#EDE8E1] border border-[#E2DDD5] dark:border-[#2E2A26] rounded hover:border-[#8B5E3C] dark:hover:border-[#D4A373] transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing' : 'Sync Now'}</span>
            </button>
          )}
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSaveConfig} className="space-y-3 pt-1">
          <div>
            <label className="block font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479] mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full font-mono text-xs bg-[#F7F5F0] dark:bg-[#151413] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-md px-3 py-2 text-[#1F1D1A] dark:text-[#EDE8E1] placeholder-[#70685E]/50 focus:outline-none focus:border-[#8B5E3C] dark:focus:border-[#D4A373]"
            />
          </div>

          <div>
            <label className="block font-mono text-xs tracking-wider uppercase text-[#70685E] dark:text-[#8C8479] mb-1">
              Supabase Anon Public Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              className="w-full font-mono text-xs bg-[#F7F5F0] dark:bg-[#151413] border border-[#E2DDD5] dark:border-[#2E2A26] rounded-md px-3 py-2 text-[#1F1D1A] dark:text-[#EDE8E1] placeholder-[#70685E]/50 focus:outline-none focus:border-[#8B5E3C] dark:focus:border-[#D4A373]"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className="font-mono text-xs tracking-wider uppercase text-[#8B5E3C] dark:text-[#D4A373] hover:underline flex items-center gap-1"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showSql ? 'Hide SQL Schema' : 'View SQL Schema'}</span>
            </button>

            <button
              type="submit"
              className="bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] hover:opacity-90 text-xs font-medium uppercase tracking-wider px-3.5 py-2 rounded-md transition-opacity flex items-center gap-1.5"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{saveSuccess ? 'Saved' : 'Save & Connect'}</span>
            </button>
          </div>

          {/* SQL Snippet View */}
          {showSql && (
            <div className="p-3 bg-[#F2EFE9]/40 dark:bg-[#181615]/50 border border-[#E2DDD5] dark:border-[#2E2A26] rounded text-xs space-y-2 mt-2">
              <div className="flex items-center justify-between font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479]">
                <span>SUPABASE SQL SCHEMA</span>
                <button
                  type="button"
                  onClick={copySql}
                  className="hover:text-[#1F1D1A] dark:hover:text-[#EDE8E1] flex items-center gap-1"
                >
                  {copiedSchema ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSchema ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="overflow-x-auto text-[11px] font-mono leading-relaxed p-2.5 bg-[#F7F5F0] dark:bg-[#151413] border border-[#E2DDD5] dark:border-[#2E2A26] rounded max-h-56 text-[#1F1D1A] dark:text-[#EDE8E1]">
                {schemaSQL}
              </pre>
            </div>
          )}
        </form>
      </div>

      {/* App Preferences */}
      <div className="p-4 sm:p-5 rounded-lg bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
        <h3 className="font-serif tracking-widest uppercase text-xs font-bold text-[#70685E] dark:text-[#8C8479]">
          Ledger Preferences &amp; Schedule
        </h3>

        {/* Daily Reset Time Picker */}
        <div className="flex items-center justify-between py-2 border-b border-[#E2DDD5] dark:border-[#2E2A26]">
          <div>
            <p className="text-sm font-medium text-[#1F1D1A] dark:text-[#EDE8E1]">
              Daily Rollover Hour
            </p>
            <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479]">
              Time when resolved tasks archive and unresolved notices carry forward
            </p>
          </div>
          <input
            type="time"
            value={settings.reset_time || '04:00'}
            onChange={(e) => updateSettings({ reset_time: e.target.value })}
            className="px-2.5 py-1 font-mono text-xs font-semibold rounded border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] text-[#1F1D1A] dark:text-[#EDE8E1] focus:outline-none focus:border-[#8B5E3C] dark:focus:border-[#D4A373]"
          />
        </div>

        {/* Sound FX Toggle */}
        <div className="flex items-center justify-between py-1.5 border-b border-[#E2DDD5] dark:border-[#2E2A26]">
          <div>
            <p className="text-sm font-medium text-[#1F1D1A] dark:text-[#EDE8E1]">
              Audible Chimes
            </p>
            <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479]">
              Subtle audio tone when marking a notice as claimed
            </p>
          </div>
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`px-3 py-1 rounded border font-mono text-xs tracking-wider uppercase transition-colors ${
              settings.soundEnabled
                ? 'bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] border-[#1F1D1A] dark:border-[#EDE8E1] font-semibold'
                : 'bg-[#F7F5F0] dark:bg-[#151413] text-[#70685E] dark:text-[#8C8479] border-[#E2DDD5] dark:border-[#2E2A26]'
            }`}
          >
            {settings.soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Confetti Toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-[#1F1D1A] dark:text-[#EDE8E1]">
              Completion Flourish
            </p>
            <p className="font-mono text-xs tracking-wider text-[#70685E] dark:text-[#8C8479]">
              Visual celebration when the daily board is cleared
            </p>
          </div>
          <button
            onClick={() => updateSettings({ confettiEnabled: !settings.confettiEnabled })}
            className={`px-3 py-1 rounded border font-mono text-xs tracking-wider uppercase transition-colors ${
              settings.confettiEnabled
                ? 'bg-[#1F1D1A] dark:bg-[#EDE8E1] text-[#FFFDF9] dark:text-[#151413] border-[#1F1D1A] dark:border-[#EDE8E1] font-semibold'
                : 'bg-[#F7F5F0] dark:bg-[#151413] text-[#70685E] dark:text-[#8C8479] border-[#E2DDD5] dark:border-[#2E2A26]'
            }`}
          >
            {settings.confettiEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="p-4 sm:p-5 rounded-lg bg-[#FFFDF9] dark:bg-[#1E1C1A] border border-[#E2DDD5] dark:border-[#2E2A26] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
        <h3 className="font-serif tracking-widest uppercase text-xs font-bold text-[#70685E] dark:text-[#8C8479]">
          Records &amp; Local Storage
        </h3>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleExportData}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-[#E2DDD5] dark:border-[#2E2A26] bg-[#F7F5F0] dark:bg-[#151413] hover:border-[#8B5E3C] dark:hover:border-[#D4A373] text-[#1F1D1A] dark:text-[#EDE8E1] font-mono text-xs tracking-wider uppercase transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset all local ledger records and start fresh?')) {
                clearAllLocalData();
              }
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-[#9E2A2B]/40 dark:border-[#C94A4B]/40 bg-[#F7F5F0] dark:bg-[#151413] hover:bg-[#9E2A2B] hover:text-[#FFFDF9] text-[#9E2A2B] dark:text-[#C94A4B] font-mono text-xs tracking-wider uppercase transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
