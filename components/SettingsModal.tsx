'use client';

import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Volume2,
  VolumeX,
  Sparkles,
  Trash2,
  Download,
  Code2,
  Copy,
  Check,
  Clock,
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
    a.download = `focusday-backup-${getLocalDateString()}.json`;
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
  day_of_week integer check (day_of_week between 0 and 6), -- 0 = Sun, 1 = Mon ... 6 = Sat
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 4. Create User Settings Table
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  reset_time text not null default '04:00',
  last_reset_date date,
  day_ended_date date,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 5. Indexes for Fast Filtering & Ordering
create index if not exists idx_daily_tasks_user_date on public.daily_tasks(user_id, date_assigned, order_index);
create index if not exists idx_pool_tasks_user on public.pool_tasks(user_id);
create index if not exists idx_recurring_tasks_user on public.recurring_tasks(user_id);

-- 6. Enable Row Level Security (RLS)
alter table public.daily_tasks enable row level security;
alter table public.pool_tasks enable row level security;
alter table public.recurring_tasks enable row level security;
alter table public.user_settings enable row level security;

-- 7. RLS Policies for daily_tasks
drop policy if exists "Users can view their own daily tasks" on public.daily_tasks;
create policy "Users can view their own daily tasks"
  on public.daily_tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own daily tasks" on public.daily_tasks;
create policy "Users can insert their own daily tasks"
  on public.daily_tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own daily tasks" on public.daily_tasks;
create policy "Users can update their own daily tasks"
  on public.daily_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own daily tasks" on public.daily_tasks;
create policy "Users can delete their own daily tasks"
  on public.daily_tasks for delete
  using (auth.uid() = user_id);

-- 8. RLS Policies for pool_tasks
drop policy if exists "Users can view their own pool tasks" on public.pool_tasks;
create policy "Users can view their own pool tasks"
  on public.pool_tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own pool tasks" on public.pool_tasks;
create policy "Users can insert their own pool tasks"
  on public.pool_tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own pool tasks" on public.pool_tasks;
create policy "Users can update their own pool tasks"
  on public.pool_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own pool tasks" on public.pool_tasks;
create policy "Users can delete their own pool tasks"
  on public.pool_tasks for delete
  using (auth.uid() = user_id);

-- 9. RLS Policies for recurring_tasks
drop policy if exists "Users can view their own recurring tasks" on public.recurring_tasks;
create policy "Users can view their own recurring tasks"
  on public.recurring_tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own recurring tasks" on public.recurring_tasks;
create policy "Users can insert their own recurring tasks"
  on public.recurring_tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own recurring tasks" on public.recurring_tasks;
create policy "Users can update their own recurring tasks"
  on public.recurring_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own recurring tasks" on public.recurring_tasks;
create policy "Users can delete their own recurring tasks"
  on public.recurring_tasks for delete
  using (auth.uid() = user_id);

-- 10. RLS Policies for user_settings
drop policy if exists "Users can view their own settings" on public.user_settings;
create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own settings" on public.user_settings;
create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ====================================================================
-- 11. Helper Functions (RPC)
-- ====================================================================

-- Helper: Rollover incomplete tasks from previous days to today (uses client's local/logical p_today)
create or replace function rollover_incomplete_tasks(p_today date default current_date)
returns setof public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_today date := coalesce(p_today, current_date);
begin
  return query
  update public.daily_tasks
  set date_assigned = v_today
  where user_id = auth.uid()
    and completed = false
    and date_assigned < v_today
  returning *;
end;
$$;

-- Helper: Pull one random pool task and copy it into today's daily list (preserving notes & color, preserving pool item)
create or replace function pull_bonus_task(p_today date default current_date)
returns public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_pool_id uuid;
  v_title text;
  v_notes text;
  v_color text;
  v_target_date date;
  v_new_task public.daily_tasks;
  v_max_order integer;
begin
  v_target_date := coalesce(p_today, current_date);

  select id, title, notes, color into v_pool_id, v_title, v_notes, v_color
  from public.pool_tasks
  where user_id = auth.uid()
  order by random()
  limit 1;

  if v_pool_id is null then
    return null;
  end if;

  select coalesce(max(order_index), 0) + 1 into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = v_target_date;

  insert into public.daily_tasks (user_id, title, notes, color, completed, order_index, date_assigned)
  values (auth.uid(), v_title, v_notes, v_color, false, v_max_order, v_target_date)
  returning * into v_new_task;

  -- The Bonus Pool acts as an indefinite library/reservoir: do NOT delete from pool_tasks.

  return v_new_task;
end;
$$;

-- Helper: Clear completed tasks for current user
create or replace function clear_completed_tasks()
returns void
language plpgsql
security invoker
as $$
begin
  delete from public.daily_tasks
  where user_id = auth.uid()
    and completed = true;
end;
$$;

-- Helper: Clear all daily tasks for today (uses client's local/logical p_today)
create or replace function clear_all_daily_tasks(p_today date default current_date)
returns void
language plpgsql
security invoker
as $$
declare
  v_today date := coalesce(p_today, current_date);
begin
  delete from public.daily_tasks
  where user_id = auth.uid()
    and date_assigned = v_today;
end;
$$;

-- Helper: Automatically generate due recurring tasks for today (preserving notes & color, deduplicated)
create or replace function generate_due_recurring_tasks(p_today date default current_date)
returns setof public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_current_dow integer;
  v_max_order integer;
  rec record;
  v_new_task public.daily_tasks;
  v_target_date date;
begin
  v_target_date := coalesce(p_today, current_date);
  v_current_dow := extract(dow from v_target_date)::integer;

  select coalesce(max(order_index), 0) into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = v_target_date;

  for rec in
    select r.id, r.title, r.notes, r.color
    from public.recurring_tasks r
    where r.user_id = auth.uid()
      and (
        r.frequency = 'daily'
        or (r.frequency = 'weekly' and r.day_of_week = v_current_dow)
      )
      and not exists (
        select 1 from public.daily_tasks d
        where d.user_id = auth.uid()
          and d.date_assigned = v_target_date
          and lower(trim(d.title)) = lower(trim(r.title))
          and d.completed = false
      )
  loop
    v_max_order := v_max_order + 1;
    insert into public.daily_tasks (user_id, title, notes, color, completed, order_index, date_assigned)
    values (auth.uid(), rec.title, rec.notes, rec.color, false, v_max_order, v_target_date)
    returning * into v_new_task;

    return next v_new_task;
  end loop;

  return;
end;
$$;

-- Helper: Push template to today's daily tasks (preserving notes & color, prevents duplicate active tasks)
create or replace function push_template_to_daily(p_title text, p_notes text default null, p_color text default null, p_target_date date default current_date)
returns public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_target_date date;
  v_max_order integer;
  v_new_task public.daily_tasks;
  v_existing_id uuid;
begin
  v_target_date := coalesce(p_target_date, current_date);

  -- Deduplication check: do not insert if an active/incomplete task with matching title already exists on target date
  select id into v_existing_id
  from public.daily_tasks
  where user_id = auth.uid()
    and date_assigned = v_target_date
    and lower(trim(title)) = lower(trim(p_title))
    and completed = false
  limit 1;

  if v_existing_id is not null then
    return null;
  end if;

  select coalesce(max(order_index), 0) + 1 into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = v_target_date;

  insert into public.daily_tasks (user_id, title, notes, color, completed, order_index, date_assigned)
  values (auth.uid(), p_title, p_notes, p_color, false, v_max_order, v_target_date)
  returning * into v_new_task;

  return v_new_task;
end;
$$;

-- Helper: Add task for tomorrow
create or replace function add_task_for_tomorrow(p_title text, p_notes text default null, p_color text default null)
returns public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_tomorrow date;
  v_max_order integer;
  v_new_task public.daily_tasks;
  v_existing_id uuid;
begin
  v_tomorrow := current_date + 1;

  select id into v_existing_id
  from public.daily_tasks
  where user_id = auth.uid()
    and date_assigned = v_tomorrow
    and lower(trim(title)) = lower(trim(p_title))
    and completed = false
  limit 1;

  if v_existing_id is not null then
    return null;
  end if;

  select coalesce(max(order_index), 0) + 1 into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = v_tomorrow;

  insert into public.daily_tasks (user_id, title, notes, color, completed, order_index, date_assigned)
  values (auth.uid(), p_title, p_notes, p_color, false, v_max_order, v_tomorrow)
  returning * into v_new_task;

  return v_new_task;
end;
$$;

-- Helper: Move task to specific date (defaults to today)
create or replace function move_task_to_date(p_task_id uuid, p_new_date date default current_date)
returns public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_target_date date;
  v_max_order integer;
  v_updated_task public.daily_tasks;
begin
  v_target_date := coalesce(p_new_date, current_date);

  select coalesce(max(order_index), 0) + 1 into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = v_target_date;

  update public.daily_tasks
  set date_assigned = v_target_date,
      order_index = v_max_order
  where id = p_task_id and user_id = auth.uid()
  returning * into v_updated_task;

  return v_updated_task;
end;
$$;

-- Helper: Move task from tomorrow to today
create or replace function move_task_to_today(p_task_id uuid)
returns public.daily_tasks
language plpgsql
security invoker
as $$
begin
  return move_task_to_date(p_task_id, current_date);
end;
$$;`;

  const copySql = () => {
    navigator.clipboard.writeText(schemaSQL);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Settings &amp; Cloud Sync
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Manage your cloud database sync, email authentication, and app preferences.
        </p>
      </div>

      {/* Supabase User Authentication Card */}
      <AuthCard />

      {/* Cloud Sync Config Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Supabase Real-Time Cloud Sync
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sync tasks instantly across your phone, tablet, and laptop.
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600 dark:text-slate-300">Status:</span>
            <span
              className={`font-semibold flex items-center gap-1 ${
                isSyncing
                  ? 'text-blue-600 dark:text-blue-400'
                  : syncStatus === 'synced'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : syncStatus === 'offline'
                  ? 'text-amber-600 dark:text-amber-400'
                  : syncStatus === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-500'
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : syncStatus === 'synced' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : syncStatus === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : null}
              {isSyncing ? 'SYNCING...' : syncStatus.toUpperCase()}
            </span>
          </div>

          {enabled && (
            <button
              onClick={refreshTasks}
              disabled={isSyncing}
              className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSaveConfig} className="space-y-2.5 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supabase Anon Public API Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showSql ? 'Hide SQL Schema' : 'View SQL Schema & RPCs'}</span>
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{saveSuccess ? 'Saved!' : 'Save & Connect'}</span>
            </button>
          </div>

          {/* SQL Snippet View */}
          {showSql && (
            <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs space-y-2 mt-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono">Supabase SQL Schema &amp; RPCs</span>
                <button
                  type="button"
                  onClick={copySql}
                  className="hover:text-white flex items-center gap-1"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="overflow-x-auto text-[11px] font-mono leading-relaxed p-2 bg-slate-950 rounded-lg max-h-56">
                {schemaSQL}
              </pre>
            </div>
          )}
        </form>
      </div>

      {/* App Preferences */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
          Preferences &amp; Daily Schedule
        </h3>

        {/* Daily Reset Time Picker */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Daily Reset Time
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-clears completed tasks each day at this time
              </p>
            </div>
          </div>
          <input
            type="time"
            value={settings.reset_time || '04:00'}
            onChange={(e) => updateSettings({ reset_time: e.target.value })}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Sound FX Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Sound Effects
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Play pleasant audio chimes on task completion
              </p>
            </div>
          </div>
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              settings.soundEnabled
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
            }`}
          >
            {settings.soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Confetti Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Celebration Confetti
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Show confetti fireworks when daily tasks are done
              </p>
            </div>
          </div>
          <button
            onClick={() => updateSettings({ confettiEnabled: !settings.confettiEnabled })}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              settings.confettiEnabled
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
            }`}
          >
            {settings.confettiEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
          Data &amp; Local Backup
        </h3>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleExportData}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset all local tasks and start fresh?')) {
                clearAllLocalData();
              }
            }}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Local Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
