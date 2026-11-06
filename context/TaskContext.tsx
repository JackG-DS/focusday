'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { arrayMove } from '@dnd-kit/sortable';
import {
  DailyTask,
  PoolTask,
  RecurringTask,
  UserSettings,
  SupabaseConfig,
  SyncStatus,
  ActiveTab,
  RolloverReport,
  AuthUserState,
  TaskActionResult,
  BountyTaskMeta,
  BountyLedgerEntry,
  WeeklyBountySummary,
} from '@/lib/types';
import {
  StorageService,
  getTodayDateString,
  generateUUID,
  getOrCreateUserId,
  calculateTaskBountyValue,
  getMinutesUntilNextDecay,
  isTaskBonusBounty,
  getLogicalDayStartIso,
  getWeekStartDateString,
  getWeekEndDateString,
  formatWeekRangeLabel,
} from '@/lib/storage';
import { getLocalDateString, getTomorrowDateString, getLogicalDate, formatDateComponents } from '@/lib/dateUtils';
import {
  getSupabaseClient,
  getAuthSession,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  rolloverIncompleteTasksRPC,
  pullBonusTaskRPC,
  clearCompletedTasksRPC,
  clearAllDailyTasksRPC,
  generateDueRecurringTasksRPC,
  pushTemplateToDailyRPC,
  addTaskForTomorrowRPC,
  moveTaskToTodayRPC,
} from '@/lib/supabaseClient';

interface TaskContextType {
  // Navigation & View
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Loading & Sync States
  isLoading: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  syncErrorMessage: string | null;
  dismissSyncError: () => void;
  refreshTasks: () => Promise<void>;
  syncWithCloud: () => Promise<void>;

  // Authentication
  authUser: AuthUserState;
  authLoading: boolean;
  authError: string | null;
  setAuthError: (error: string | null) => void;
  handleSignIn: (email: string, password: string) => Promise<boolean>;
  handleSignUp: (email: string, password: string) => Promise<boolean>;
  handleSignOut: () => Promise<void>;

  // Daily Tasks (Today & Tomorrow)
  dailyTasks: DailyTask[];
  todaysTasks: DailyTask[];
  tomorrowTasks: DailyTask[];
  todayStr: string;
  tomorrowStr: string;
  historyDates: string[];
  getTasksForDate: (date: string) => DailyTask[];
  addDailyTask: (title: string, notes?: string | null, color?: string | null, date?: string) => Promise<TaskActionResult>;
  toggleDailyTask: (id: string) => Promise<void>;
  updateDailyTaskTitle: (id: string, newTitle: string) => Promise<void>;
  updateDailyTaskNotes: (id: string, newNotes: string | null) => Promise<void>;
  updateDailyTaskColor: (id: string, newColor: string | null) => Promise<void>;
  deleteDailyTask: (id: string) => Promise<void>;
  reorderDailyTasks: (activeId: string, overId: string) => Promise<void>;
  moveTaskToToday: (taskId: string) => Promise<void>;
  clearAllDailyTasks: () => Promise<void>;

  // End Day & Focus Mode
  endDay: () => Promise<void>;
  resumeDay: () => Promise<void>;
  isDayEnded: boolean;

  // Bonus Pool Tasks
  poolTasks: PoolTask[];
  addPoolTask: (title: string, notes?: string | null, color?: string | null) => Promise<void>;
  deletePoolTask: (id: string) => Promise<void>;
  pullBonusTaskToToday: (id?: string) => Promise<DailyTask | null>;

  // Recurring Tasks
  recurringTasks: RecurringTask[];
  addRecurringTask: (
    title: string,
    frequency: 'daily' | 'weekly',
    day_of_week?: number,
    notes?: string | null,
    color?: string | null
  ) => Promise<void>;
  updateRecurringTask: (id: string, updates: Partial<RecurringTask>) => Promise<void>;
  deleteRecurringTask: (id: string) => Promise<void>;
  pushTemplateToToday: (title: string, notes?: string | null, color?: string | null) => Promise<TaskActionResult>;

  // Midnight Rollover & Streaks
  rolloverReport: RolloverReport | null;
  dismissRolloverReport: () => void;
  streakCount: number;
  isTodayAllCompleted: boolean;
  todaysCompletionPercentage: number;

  // Bounty System & Weekly Pool
  getTaskBountyValue: (task: DailyTask) => number;
  getTaskMinutesUntilDecay: (task: DailyTask) => number | null;
  isTaskBonus: (task: DailyTask) => boolean;
  currentWeekBountyPool: number;
  todayBountyEarned: number;
  currentWeekRangeLabel: string;
  isSundayPoolReset: boolean;
  weeklyBountyHistory: WeeklyBountySummary[];
  getDateBountyTotal: (date: string) => number;

  // Bonus Reward Celebration
  celebrationModalTask: DailyTask | null;
  dismissCelebrationModal: () => void;
  triggerConfetti: () => void;

  // Settings & Storage
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  supabaseConfig: SupabaseConfig;
  updateSupabaseConfig: (config: SupabaseConfig) => Promise<void>;
  clearAllLocalData: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string>('local-user');
  const [authUser, setAuthUser] = useState<AuthUserState>({
    id: 'local-user',
    email: null,
    isAuthenticated: false,
  });
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [poolTasks, setPoolTasks] = useState<PoolTask[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [bountyMetaMap, setBountyMetaMap] = useState<Record<string, BountyTaskMeta>>({});
  const [bountyLedger, setBountyLedger] = useState<BountyLedgerEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings>(StorageService.getSettings());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(StorageService.getSupabaseConfig());
  const [rolloverReport, setRolloverReport] = useState<RolloverReport | null>(null);
  const [celebrationModalTask, setCelebrationModalTask] = useState<DailyTask | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const isRefreshingRef = useRef(false);

  // Periodically re-evaluate logical date so open tabs roll over cleanly at reset_time (e.g., 04:00 AM)
  useEffect(() => {
    const interval = setInterval(() => {
      setClockTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = useMemo(
    () => getLocalDateString(new Date(), settings.reset_time),
    [settings.reset_time, clockTick]
  );
  const tomorrowStr = useMemo(
    () => getTomorrowDateString(new Date(), settings.reset_time),
    [settings.reset_time, clockTick]
  );

  // Confetti trigger helper
  const triggerConfetti = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#3b82f6', '#eab308', '#ec4899', '#8b5cf6'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 250);
    } catch (e) {
      console.warn('Confetti trigger error:', e);
    }
  }, []);

  // Sound effect helper
  const playSound = useCallback((type: 'complete' | 'bonus' | 'rollover') => {
    if (typeof window === 'undefined' || !settings.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'complete') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'bonus') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {
      // AudioContext unavailable
    }
  }, [settings.soundEnabled]);

  // Dismiss sync error
  const dismissSyncError = useCallback(() => {
    setSyncErrorMessage(null);
  }, []);

  // Check if logical date has rolled over since last_reset_date
  // Because getLocalDateString() shifts by reset_time (e.g. 04:00 AM), the logical date
  // only advances once the local clock passes reset_time.
  const checkShouldReset = useCallback((resetTime: string = '04:00', lastResetDate?: string): boolean => {
    const logicalToday = getLocalDateString(new Date(), resetTime);
    if (!lastResetDate) {
      return false;
    }
    return lastResetDate < logicalToday;
  }, []);

  // Save Settings to Local Storage & Supabase
  const updateSettings = useCallback(
    (newSettings: Partial<UserSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        StorageService.saveSettings(updated);

        // Sync with public.user_settings if authenticated
        if (supabaseConfig.enabled && authUser.isAuthenticated && authUser.id) {
          const client = getSupabaseClient(supabaseConfig);
          if (client) {
            client
              .from('user_settings')
              .upsert({
                user_id: authUser.id,
                reset_time: updated.reset_time || '04:00',
                last_reset_date: updated.last_reset_date || null,
                day_ended_date: updated.day_ended_date || null,
                updated_at: new Date().toISOString(),
              })
              .then(({ error }) => {
                if (error) {
                  console.warn('[TaskContext] Error saving user_settings:', error.message);
                }
              });
          }
        }

        return updated;
      });
    },
    [supabaseConfig, authUser]
  );

  // Check if day is currently marked as ended for today
  const isDayEnded = useMemo(() => {
    return settings.day_ended_date === todayStr;
  }, [settings.day_ended_date, todayStr]);

  // End Day action
  const endDay = useCallback(async () => {
    const today = getTodayDateString();
    updateSettings({ day_ended_date: today });
    triggerConfetti();
    playSound('complete');
  }, [updateSettings, triggerConfetti, playSound]);

  // Resume Day action
  const resumeDay = useCallback(async () => {
    updateSettings({ day_ended_date: null });
  }, [updateSettings]);

  // =========================================================================
  // Manual & On-Load Refresh Method (Only Reads from Supabase)
  // =========================================================================
  const refreshTasks = useCallback(async (overrideUserId?: string) => {
    if (!supabaseConfig.enabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      setIsSyncing(false);
      setSyncStatus('idle');
      return;
    }

    const targetUserId = overrideUserId || (authUser.isAuthenticated ? authUser.id : userId);
    if (!targetUserId || targetUserId === 'local-user') {
      setIsSyncing(false);
      setSyncStatus('idle');
      return;
    }

    const supabase = getSupabaseClient(supabaseConfig);
    if (!supabase) {
      setIsSyncing(false);
      setSyncStatus('error');
      return;
    }

    if (isRefreshingRef.current) {
      return;
    }
    isRefreshingRef.current = true;

    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncErrorMessage(null);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Sync timeout (5s). Database unreachable.')), 5000)
    );

    try {
      await Promise.race([
        (async () => {
          let effectiveResetTime = (settings.reset_time || '04:00').slice(0, 5);
          let effectiveLastReset = settings.last_reset_date || '';
          let effectiveDayEnded = settings.day_ended_date || null;

          // 1. Fetch Remote User Settings FIRST so we use the user's configured reset_time
          try {
            const { data: userSettingsData } = await supabase
              .from('user_settings')
              .select('*')
              .eq('user_id', targetUserId)
              .maybeSingle();

            if (userSettingsData) {
              effectiveResetTime = (userSettingsData.reset_time || effectiveResetTime || '04:00').slice(0, 5);
              effectiveLastReset = userSettingsData.last_reset_date || effectiveLastReset || '';
              effectiveDayEnded = userSettingsData.day_ended_date ?? effectiveDayEnded ?? null;

              setSettings((prev) => {
                const merged: UserSettings = {
                  ...prev,
                  reset_time: effectiveResetTime,
                  last_reset_date: effectiveLastReset,
                  day_ended_date: effectiveDayEnded,
                };
                StorageService.saveSettings(merged);
                return merged;
              });
            }
          } catch (settingsErr) {
            console.warn('[TaskContext] Optional user_settings fetch skipped:', settingsErr);
          }

          // Compute logical Today and Tomorrow using the user's reset_time (e.g. 04:00 AM)
          const localToday = getLocalDateString(new Date(), effectiveResetTime);
          const localTomorrow = getTomorrowDateString(new Date(), effectiveResetTime);

          // 2. Check Daily Auto-Reset Threshold (only when logical date has advanced past last_reset_date)
          if (checkShouldReset(effectiveResetTime, effectiveLastReset)) {
            console.log('[TaskContext] Logical day reset reached for:', localToday);
            updateSettings({
              reset_time: effectiveResetTime,
              last_reset_date: localToday,
              day_ended_date: null,
            });
          } else if (!effectiveLastReset) {
            updateSettings({
              reset_time: effectiveResetTime,
              last_reset_date: localToday,
            });
          } else if (effectiveDayEnded && effectiveDayEnded !== localToday) {
            updateSettings({
              day_ended_date: null,
            });
          }

          // 3. Call rollover_incomplete_tasks with client's logical localToday (prevents UTC midnight premature rollover!)
          try {
            await supabase.rpc('rollover_incomplete_tasks', { p_today: localToday });
          } catch (rolloverErr) {
            console.warn('[TaskContext] rollover_incomplete_tasks RPC error:', rolloverErr);
          }

          // 4. Call generate_due_recurring_tasks with local date parameter
          try {
            await supabase.rpc('generate_due_recurring_tasks', { p_today: localToday });
          } catch (recurringRpcErr) {
            console.warn('[TaskContext] generate_due_recurring_tasks RPC error:', recurringRpcErr);
          }

          // 5. Fetch all daily_tasks for the user (today, tomorrow, and historical archive)
          const { data: allDailyData, error: allDailyError } = await supabase
            .from('daily_tasks')
            .select('*')
            .order('date_assigned', { ascending: false })
            .order('order_index', { ascending: true });

          if (allDailyError) {
            console.error('[TaskContext] Fetch error:', allDailyError);
          }

          let cloudPool: PoolTask[] = [];
          let cloudRecurring: RecurringTask[] = [];

          try {
            const [poolRes, recurringRes] = await Promise.all([
              supabase.from('pool_tasks').select('*').order('created_at', { ascending: false }),
              supabase.from('recurring_tasks').select('*').order('created_at', { ascending: false }),
            ]);

            if (poolRes.error) {
              console.error('[TaskContext] Fetch error (pool_tasks):', poolRes.error);
            } else {
              cloudPool = poolRes.data || [];
            }

            if (recurringRes.error) {
              console.error('[TaskContext] Fetch error (recurring_tasks):', recurringRes.error);
            } else {
              cloudRecurring = recurringRes.data || [];
            }
          } catch (extraErr) {
            console.error('[TaskContext] Fetch error (pool/recurring):', extraErr);
          }

          const storedMeta = StorageService.getBountyMetaMap();
          const poolTitleSet = new Set(cloudPool.map((p) => p.title.trim().toLowerCase()));
          const rawCloudDaily: DailyTask[] = allDailyData || [];

          const cloudDaily: DailyTask[] = rawCloudDaily.map((t) => {
            const meta = storedMeta[t.id];
            const inferredBonus =
              t.is_bonus ?? meta?.is_bonus ?? isTaskBonusBounty(t, poolTitleSet);
            return {
              ...t,
              is_bonus: inferredBonus,
              bounty_started_at: t.bounty_started_at || meta?.bounty_started_at || t.created_at,
              bounty_earned: t.bounty_earned ?? meta?.bounty_earned ?? null,
              completed_at: t.completed_at ?? meta?.completed_at ?? null,
            };
          });

          // Backfill any completed cloud tasks into the local bounty ledger so weekly pool & history chart stay synced
          const storedLedger = StorageService.getBountyLedger();
          const ledgerByTaskId = new Map(storedLedger.map((entry) => [entry.taskId, entry]));
          let ledgerChanged = false;

          for (const t of cloudDaily) {
            if (t.completed && !ledgerByTaskId.has(t.id)) {
              const amount =
                typeof t.bounty_earned === 'number'
                  ? t.bounty_earned
                  : t.is_bonus
                  ? 10
                  : calculateTaskBountyValue(t, t.date_assigned, Date.now(), poolTitleSet);
              const entry: BountyLedgerEntry = {
                taskId: t.id,
                title: t.title,
                amount,
                date: t.date_assigned,
                weekStart: getWeekStartDateString(t.date_assigned),
                completedAt: t.completed_at || t.created_at || new Date().toISOString(),
                isBonus: Boolean(t.is_bonus),
              };
              ledgerByTaskId.set(t.id, entry);
              ledgerChanged = true;
            }
          }

          if (ledgerChanged) {
            const updatedLedger = Array.from(ledgerByTaskId.values());
            setBountyLedger(updatedLedger);
            StorageService.saveBountyLedger(updatedLedger);
          }

          console.log('[TaskContext] Tasks fetched from cloud:', {
            totalDailyCount: cloudDaily.length,
            poolCount: cloudPool.length,
            recurringCount: cloudRecurring.length,
          });

          // Disable Offline LocalStorage Overwrite for Authenticated Users:
          // When a user is authenticated, do NOT merge stale local storage tasks into Supabase query results.
          // The Supabase database must be the single source of truth upon login.
          setDailyTasks(cloudDaily);
          StorageService.saveDailyTasks(cloudDaily);

          setPoolTasks(cloudPool);
          StorageService.savePoolTasks(cloudPool);

          setRecurringTasks(cloudRecurring);
          StorageService.saveRecurringTasks(cloudRecurring);

          setSyncStatus('synced');
          setSyncErrorMessage(null);
        })(),
        timeoutPromise,
      ]);
    } catch (err: any) {
      console.error('[TaskContext] Fetch error:', err);
      setSyncStatus('error');
      setSyncErrorMessage(err?.message || 'Database unreachable. Running in local offline mode.');
    } finally {
      isRefreshingRef.current = false;
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [
    supabaseConfig,
    authUser,
    userId,
    settings.reset_time,
    settings.last_reset_date,
    checkShouldReset,
    updateSettings,
  ]);

  // Alias for backward compatibility
  const syncWithCloud = refreshTasks;

  // =========================================================================
  // Initial Mount: Synchronous Local State + Session Initialization
  // =========================================================================
  useEffect(() => {
    const localUid = getOrCreateUserId();
    setUserId(localUid);

    // 1. Load Local State synchronously
    let loadedDaily = StorageService.getDailyTasks(localUid);
    const loadedPool = StorageService.getPoolTasks(localUid);
    const loadedRecurring = StorageService.getRecurringTasks(localUid);
    const loadedSettings = StorageService.getSettings();
    const loadedSupabase = StorageService.getSupabaseConfig();
    const loadedMeta = StorageService.getBountyMetaMap();
    let loadedLedger = StorageService.getBountyLedger();
    const today = getLocalDateString(new Date(), loadedSettings.reset_time);

    // Auto-Reset Check on Local Storage (only when logical date advances past last_reset_date)
    if (checkShouldReset(loadedSettings.reset_time, loadedSettings.last_reset_date)) {
      loadedSettings.last_reset_date = today;
      loadedSettings.day_ended_date = null; // Clear day ended on rollover
      StorageService.saveSettings(loadedSettings);
    } else if (!loadedSettings.last_reset_date) {
      loadedSettings.last_reset_date = today;
      StorageService.saveSettings(loadedSettings);
    }

    // Reset day_ended_date if it's from a previous logical day
    if (loadedSettings.day_ended_date && loadedSettings.day_ended_date !== today) {
      loadedSettings.day_ended_date = null;
      StorageService.saveSettings(loadedSettings);
    }

    // Local Generation of Due Recurring Tasks for Today:
    // IMPORTANT: If Supabase is configured, rely exclusively on `generate_due_recurring_tasks` RPC on cloud init
    // to prevent redundant client-side insertion loops that bypass database deduplication.
    const isCloudEnabled = Boolean(loadedSupabase.enabled && loadedSupabase.url && loadedSupabase.anonKey);
    if (!isCloudEnabled) {
      const currentDow = getLogicalDate(new Date(), loadedSettings.reset_time).getDay();
      const existingActiveTitles = new Set(
        loadedDaily
          .filter((t) => t.date_assigned === today && !t.completed)
          .map((t) => t.title.toLowerCase().trim())
      );
      const todayTasks = loadedDaily.filter((t) => t.date_assigned === today);
      let maxOrder = todayTasks.length > 0 ? Math.max(...todayTasks.map((t) => t.order_index)) : -1;

      for (const r of loadedRecurring) {
        const isDue = r.frequency === 'daily' || (r.frequency === 'weekly' && r.day_of_week === currentDow);
        if (isDue && !existingActiveTitles.has(r.title.toLowerCase().trim())) {
          maxOrder += 1;
          const nowIso = new Date().toISOString();
          const newId = generateUUID();
          loadedDaily.push({
            id: newId,
            user_id: localUid,
            title: r.title,
            notes: r.notes || null,
            color: r.color || 'default',
            completed: false,
            order_index: maxOrder,
            date_assigned: today,
            created_at: nowIso,
            is_bonus: false,
            bounty_started_at: nowIso,
          });
          loadedMeta[newId] = { is_bonus: false, bounty_started_at: nowIso };
          existingActiveTitles.add(r.title.toLowerCase().trim());
        }
      }
      StorageService.saveBountyMetaMap(loadedMeta);
    }

    // Local Rollover (only when offline / local mode; cloud rollover runs in refreshTasks with p_today)
    if (!isCloudEnabled) {
      const overdueIncompleteTasks = loadedDaily.filter(
        (task) => !task.completed && task.date_assigned < today
      );

      if (overdueIncompleteTasks.length > 0) {
        const existingTodayTasks = loadedDaily.filter((t) => t.date_assigned === today);
        const minTodayOrder = existingTodayTasks.length > 0 
          ? Math.min(...existingTodayTasks.map((t) => t.order_index)) 
          : 0;

        let rolloverIndexOffset = minTodayOrder - overdueIncompleteTasks.length;

        const rolledOverTasks = loadedDaily.map((task) => {
          if (!task.completed && task.date_assigned < today) {
            return {
              ...task,
              date_assigned: today,
              order_index: rolloverIndexOffset++,
            };
          }
          return task;
        });

        const normalized = rolledOverTasks.map((task) => task);
        const todaysNormalized = normalized
          .filter((t) => t.date_assigned === today)
          .sort((a, b) => a.order_index - b.order_index)
          .map((t, idx) => ({ ...t, order_index: idx }));

        const others = normalized.filter((t) => t.date_assigned !== today);
        loadedDaily = [...others, ...todaysNormalized];

        StorageService.saveDailyTasks(loadedDaily);
        setRolloverReport({
          date: today,
          migratedCount: overdueIncompleteTasks.length,
        });
      }
    }

    // Streak Check
    let newStreak = loadedSettings.streakCount || 1;
    if (loadedSettings.lastActiveDate && loadedSettings.lastActiveDate !== today) {
      const lastActive = new Date(loadedSettings.lastActiveDate);
      const current = new Date(today);
      const diffTime = Math.abs(current.getTime() - lastActive.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        newStreak = 1;
      }
      loadedSettings.lastActiveDate = today;
      loadedSettings.streakCount = newStreak;
      StorageService.saveSettings(loadedSettings);
    }

    // Enrich loadedDaily with stored bounty meta & backfill ledger for any already-completed tasks
    const poolTitleSet = new Set(loadedPool.map((p) => p.title.trim().toLowerCase()));
    loadedDaily = loadedDaily.map((t) => {
      const meta = loadedMeta[t.id];
      const inferredBonus = t.is_bonus ?? meta?.is_bonus ?? isTaskBonusBounty(t, poolTitleSet);
      return {
        ...t,
        is_bonus: inferredBonus,
        bounty_started_at: t.bounty_started_at || meta?.bounty_started_at || t.created_at,
        bounty_earned: t.bounty_earned ?? meta?.bounty_earned ?? null,
        completed_at: t.completed_at ?? meta?.completed_at ?? null,
      };
    });

    const ledgerMap = new Map(loadedLedger.map((entry) => [entry.taskId, entry]));
    let ledgerUpdated = false;
    for (const t of loadedDaily) {
      if (t.completed && !ledgerMap.has(t.id)) {
        const earned =
          typeof t.bounty_earned === 'number'
            ? t.bounty_earned
            : t.is_bonus
            ? 10
            : calculateTaskBountyValue(t, t.date_assigned, Date.now(), poolTitleSet);
        ledgerMap.set(t.id, {
          taskId: t.id,
          title: t.title,
          amount: earned,
          date: t.date_assigned,
          weekStart: getWeekStartDateString(t.date_assigned),
          completedAt: t.completed_at || t.created_at || new Date().toISOString(),
          isBonus: Boolean(t.is_bonus),
        });
        ledgerUpdated = true;
      }
    }
    if (ledgerUpdated) {
      loadedLedger = Array.from(ledgerMap.values());
      StorageService.saveBountyLedger(loadedLedger);
    }

    setDailyTasks(loadedDaily);
    setPoolTasks(loadedPool);
    setRecurringTasks(loadedRecurring);
    setBountyMetaMap(loadedMeta);
    setBountyLedger(loadedLedger);
    setSettings(loadedSettings);
    setSupabaseConfig(loadedSupabase);
    setIsClientReady(true);

    // 2. Check Supabase Auth Session on Mount
    // Setting authUser triggers the useEffect below which calls refreshTasks() (passing localToday to rollover & recurring RPCs)
    if (loadedSupabase.enabled && loadedSupabase.url && loadedSupabase.anonKey) {
      getAuthSession(loadedSupabase)
        .then(async (session) => {
          if (session?.user) {
            console.log('[TaskContext] User session found on mount:', session.user.id);
            setAuthUser({
              id: session.user.id,
              email: session.user.email || null,
              isAuthenticated: true,
            });
            setUserId(session.user.id);
          } else {
            console.log('[TaskContext] No active session on mount, using local mode.');
            setAuthUser({
              id: localUid,
              email: null,
              isAuthenticated: false,
            });
            setUserId(localUid);
          }
        })
        .catch((err) => {
          console.error('[TaskContext] Auth session lookup error:', err);
        });
    }
  }, [checkShouldReset]);

  // Listen to Auth State Changes
  useEffect(() => {
    if (!supabaseConfig.enabled || !supabaseConfig.url || !supabaseConfig.anonKey) return;
    const client = getSupabaseClient(supabaseConfig);
    if (!client) return;

    const { data: authListener } = client.auth.onAuthStateChange(
      (event, session) => {
        console.log('[TaskContext] Auth state changed:', event, session?.user?.id);
        if (session?.user) {
          setAuthUser({
            id: session.user.id,
            email: session.user.email || null,
            isAuthenticated: true,
          });
          setUserId(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          const localUid = getOrCreateUserId();
          setAuthUser({
            id: localUid,
            email: null,
            isAuthenticated: false,
          });
          setUserId(localUid);
          setSyncStatus('idle');
          setIsSyncing(false);
          setSyncErrorMessage(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabaseConfig]);

  // Fetch When User Authenticates or Logical Day Changes (e.g. crossing the 4:00 AM reset time)
  useEffect(() => {
    if (authUser.isAuthenticated && authUser.id && authUser.id !== 'local-user') {
      refreshTasks();
    }
  }, [authUser.id, authUser.isAuthenticated, todayStr]);

  // Save Daily Tasks to Local Storage
  useEffect(() => {
    if (!isClientReady) return;
    StorageService.saveDailyTasks(dailyTasks);
  }, [dailyTasks, isClientReady]);

  // Save Pool Tasks to Local Storage
  useEffect(() => {
    if (!isClientReady) return;
    StorageService.savePoolTasks(poolTasks);
  }, [poolTasks, isClientReady]);

  // Save Recurring Tasks to Local Storage
  useEffect(() => {
    if (!isClientReady) return;
    StorageService.saveRecurringTasks(recurringTasks);
  }, [recurringTasks, isClientReady]);

  // Sign In Handler
  const handleSignIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthLoading(true);
      setAuthError(null);

      const result = await signInWithEmail(email, password, supabaseConfig);
      setAuthLoading(false);

      if (result.error) {
        setAuthError(result.error.message);
        return false;
      }

      if (result.user) {
        setAuthUser({
          id: result.user.id,
          email: result.user.email || null,
          isAuthenticated: true,
        });
        setUserId(result.user.id);

        await refreshTasks(result.user.id);
        return true;
      }
      return false;
    },
    [supabaseConfig, refreshTasks]
  );

  // Sign Up Handler
  const handleSignUp = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setAuthLoading(true);
      setAuthError(null);

      const result = await signUpWithEmail(email, password, supabaseConfig);
      setAuthLoading(false);

      if (result.error) {
        setAuthError(result.error.message);
        return false;
      }

      if (result.user) {
        setAuthUser({
          id: result.user.id,
          email: result.user.email || null,
          isAuthenticated: true,
        });
        setUserId(result.user.id);

        await refreshTasks(result.user.id);
        return true;
      }
      return false;
    },
    [supabaseConfig, refreshTasks]
  );

  // Sign Out Handler
  const handleSignOut = useCallback(async () => {
    setAuthLoading(true);
    await signOutUser(supabaseConfig);
    const localUid = getOrCreateUserId();
    setAuthUser({
      id: localUid,
      email: null,
      isAuthenticated: false,
    });
    setUserId(localUid);
    const localDaily = StorageService.getDailyTasks(localUid);
    const localPool = StorageService.getPoolTasks(localUid);
    const localRecurring = StorageService.getRecurringTasks(localUid);
    setDailyTasks(localDaily);
    setPoolTasks(localPool);
    setRecurringTasks(localRecurring);
    setAuthLoading(false);
    setSyncStatus('idle');
    setIsSyncing(false);
    setSyncErrorMessage(null);
  }, [supabaseConfig]);

  // Update Supabase Config
  const updateSupabaseConfig = useCallback(async (newConfig: SupabaseConfig) => {
    setSupabaseConfig(newConfig);
    StorageService.saveSupabaseConfig(newConfig);
    if (newConfig.enabled && newConfig.url && newConfig.anonKey) {
      if (authUser.isAuthenticated && authUser.id !== 'local-user') {
        refreshTasks();
      } else {
        setSyncStatus('idle');
        setIsSyncing(false);
      }
    } else {
      setSyncStatus('idle');
      setIsSyncing(false);
      setSyncErrorMessage(null);
    }
  }, [authUser, refreshTasks]);

  // Today's Tasks
  const todaysTasks = useMemo(() => {
    return dailyTasks
      .filter((task) => task.date_assigned === todayStr)
      .sort((a, b) => a.order_index - b.order_index);
  }, [dailyTasks, todayStr]);

  // Tomorrow's Tasks
  const tomorrowTasks = useMemo(() => {
    return dailyTasks
      .filter((task) => task.date_assigned === tomorrowStr)
      .sort((a, b) => a.order_index - b.order_index);
  }, [dailyTasks, tomorrowStr]);

  // All unique dates from tasks for History view
  const historyDates = useMemo(() => {
    const dates = Array.from(new Set(dailyTasks.map((t) => t.date_assigned)));
    return dates.sort((a, b) => b.localeCompare(a));
  }, [dailyTasks]);

  const getTasksForDate = useCallback(
    (date: string) => {
      return dailyTasks
        .filter((t) => t.date_assigned === date)
        .sort((a, b) => a.order_index - b.order_index);
    },
    [dailyTasks]
  );

  // Check if today is 100% complete
  const isTodayAllCompleted = useMemo(() => {
    if (todaysTasks.length === 0) return false;
    return todaysTasks.every((task) => task.completed);
  }, [todaysTasks]);

  const todaysCompletionPercentage = useMemo(() => {
    if (todaysTasks.length === 0) return 0;
    const completedCount = todaysTasks.filter((t) => t.completed).length;
    return Math.round((completedCount / todaysTasks.length) * 100);
  }, [todaysTasks]);

  const poolTitlesSet = useMemo(() => {
    return new Set(poolTasks.map((p) => p.title.trim().toLowerCase()));
  }, [poolTasks]);

  const isTaskBonus = useCallback(
    (task: DailyTask) => {
      return isTaskBonusBounty(task, poolTitlesSet);
    },
    [poolTitlesSet]
  );

  const getTaskBountyValue = useCallback(
    (task: DailyTask) => {
      // clockTick dependency ensures live hourly updates while app is open
      void clockTick;
      return calculateTaskBountyValue(task, todayStr, Date.now(), poolTitlesSet);
    },
    [todayStr, clockTick, poolTitlesSet]
  );

  const getTaskMinutesUntilDecay = useCallback(
    (task: DailyTask) => {
      void clockTick;
      return getMinutesUntilNextDecay(task, todayStr, Date.now(), poolTitlesSet);
    },
    [todayStr, clockTick, poolTitlesSet]
  );

  const currentWeekStart = useMemo(() => getWeekStartDateString(todayStr), [todayStr]);
  const currentWeekRangeLabel = useMemo(() => formatWeekRangeLabel(currentWeekStart), [currentWeekStart]);

  // Check if today is Sunday and the user has ended the day ("End of Day Sunday" reset)
  const isSundayPoolReset = useMemo(() => {
    const logicalDow = getLogicalDate(new Date(), settings.reset_time).getDay();
    return logicalDow === 0 && isDayEnded;
  }, [settings.reset_time, isDayEnded, clockTick]);

  // Current week's bounty pool (Mon-Sun; resets automatically at End of Day Sunday)
  const currentWeekBountyPool = useMemo(() => {
    if (isSundayPoolReset) return 0;
    return bountyLedger
      .filter((entry) => entry.weekStart === currentWeekStart)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }, [bountyLedger, currentWeekStart, isSundayPoolReset]);

  // Bounty earned today
  const todayBountyEarned = useMemo(() => {
    return bountyLedger
      .filter((entry) => entry.date === todayStr)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }, [bountyLedger, todayStr]);

  const getDateBountyTotal = useCallback(
    (date: string) => {
      return bountyLedger
        .filter((entry) => entry.date === date)
        .reduce((sum, entry) => sum + entry.amount, 0);
    },
    [bountyLedger]
  );

  // Weekly Bounty History for the History tab chart (last 6 weeks + any earlier weeks with data)
  const weeklyBountyHistory = useMemo((): WeeklyBountySummary[] => {
    const weekMap = new Map<string, { totalAmount: number; tasksCount: number }>();

    // Seed last 6 weeks (oldest to newest ending with currentWeekStart)
    const parts = currentWeekStart.split('-');
    if (parts.length === 3) {
      const baseMonday = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
      );
      for (let i = 5; i >= 0; i--) {
        const d = new Date(baseMonday.getTime());
        d.setDate(d.getDate() - i * 7);
        const wStart = formatDateComponents(d);
        weekMap.set(wStart, { totalAmount: 0, tasksCount: 0 });
      }
    }

    for (const entry of bountyLedger) {
      const wStart = entry.weekStart || getWeekStartDateString(entry.date);
      const existing = weekMap.get(wStart) || { totalAmount: 0, tasksCount: 0 };
      weekMap.set(wStart, {
        totalAmount: existing.totalAmount + entry.amount,
        tasksCount: existing.tasksCount + 1,
      });
    }

    const sortedWeeks = Array.from(weekMap.keys()).sort((a, b) => a.localeCompare(b));
    return sortedWeeks.slice(-8).map((wStart) => {
      const data = weekMap.get(wStart) || { totalAmount: 0, tasksCount: 0 };
      return {
        weekStart: wStart,
        weekEnd: getWeekEndDateString(wStart),
        label: formatWeekRangeLabel(wStart),
        totalAmount: data.totalAmount,
        tasksCount: data.tasksCount,
        isCurrentWeek: wStart === currentWeekStart,
      };
    });
  }, [bountyLedger, currentWeekStart]);

  // Add Daily Task (Supports Today, Tomorrow, and Deduplication)
  const addDailyTask = useCallback(
    async (
      title: string,
      notes?: string | null,
      color?: string | null,
      date?: string
    ): Promise<TaskActionResult> => {
      if (!title.trim()) return { success: false, message: 'Task title cannot be empty' };
      const trimmedTitle = title.trim();
      const targetDate = date || getTodayDateString();
      const isTargetTomorrow = targetDate === tomorrowStr;

      // Deduplication check: check if an active/incomplete task with matching title already exists for target date
      const isDuplicate = dailyTasks.some(
        (t) =>
          t.date_assigned === targetDate &&
          !t.completed &&
          t.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
      );

      if (isDuplicate) {
        console.log('[TaskContext] Duplicate task creation prevented:', trimmedTitle);
        return {
          success: false,
          duplicate: true,
          message: isTargetTomorrow
            ? 'Target is already on tomorrow’s leads'
            : 'Target is already active on Most Wanted',
        };
      }

      const existingInDate = dailyTasks.filter((t) => t.date_assigned === targetDate);
      const maxOrder = existingInDate.length > 0 
        ? Math.max(...existingInDate.map((t) => t.order_index)) 
        : -1;

      const currentActiveUserId = authUser.isAuthenticated ? authUser.id : userId;

      // Tasks added to Tomorrow's Leads start decreasing only when they move to Today's Most Wanted
      const startTimestamp =
        targetDate > todayStr
          ? getLogicalDayStartIso(targetDate, settings.reset_time)
          : new Date().toISOString();

      const newTask: DailyTask = {
        id: generateUUID(),
        user_id: currentActiveUserId,
        title: trimmedTitle,
        notes: notes?.trim() || null,
        color: color || 'default',
        completed: false,
        order_index: maxOrder + 1,
        date_assigned: targetDate,
        created_at: startTimestamp,
        is_bonus: false,
        bounty_started_at: startTimestamp,
      };

      setBountyMetaMap((prev) => {
        const next = {
          ...prev,
          [newTask.id]: { is_bonus: false, bounty_started_at: startTimestamp },
        };
        StorageService.saveBountyMetaMap(next);
        return next;
      });

      setDailyTasks((prev) => {
        const updated = [...prev, newTask];
        StorageService.saveDailyTasks(updated);
        return updated;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await client.from('daily_tasks').insert({
              id: newTask.id,
              user_id: newTask.user_id,
              title: newTask.title,
              notes: newTask.notes,
              color: newTask.color,
              completed: newTask.completed,
              order_index: newTask.order_index,
              date_assigned: newTask.date_assigned,
              created_at: newTask.created_at,
            });
          } catch (e) {
            console.warn('Failed to insert daily task to cloud:', e);
          }
        }
      }

      return { success: true, task: newTask };
    },
    [dailyTasks, userId, authUser, supabaseConfig, tomorrowStr, todayStr, settings.reset_time]
  );

  // Move Task from Tomorrow (or any date) to Today
  const moveTaskToToday = useCallback(
    async (taskId: string) => {
      const task = dailyTasks.find((t) => t.id === taskId);
      if (!task) return;

      const localToday = getLocalDateString();
      const nowIso = new Date().toISOString();
      const currentTodayTasks = dailyTasks.filter((t) => t.date_assigned === localToday);
      const maxOrder = currentTodayTasks.length > 0 ? Math.max(...currentTodayTasks.map((t) => t.order_index)) : -1;

      setBountyMetaMap((prev) => {
        const next = {
          ...prev,
          [taskId]: {
            ...(prev[taskId] || {}),
            is_bonus: Boolean(task.is_bonus),
            bounty_started_at: nowIso,
          },
        };
        StorageService.saveBountyMetaMap(next);
        return next;
      });

      // 1. Optimistic Local State Update: cleanly transitions item between tomorrowTasks and todaysTasks
      // and starts the $100 -> -$1/hr decay timer now!
      const updatedTasks = dailyTasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              date_assigned: localToday,
              order_index: maxOrder + 1,
              created_at: nowIso,
              bounty_started_at: nowIso,
            }
          : t
      );
      setDailyTasks(updatedTasks);
      StorageService.saveDailyTasks(updatedTasks);
      playSound('complete');

      // 2. Cloud DB Update: Call move_task_to_date with localToday and update state directly with returned record
      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const supabase = getSupabaseClient(supabaseConfig);
        if (supabase) {
          try {
            const { data, error } = await supabase.rpc('move_task_to_date', { 
              p_task_id: taskId, 
              p_new_date: localToday 
            });

            await supabase
              .from('daily_tasks')
              .update({ created_at: nowIso })
              .eq('id', taskId);

            if (error) {
              console.error('[TaskContext] move_task_to_date error:', error);
            } else if (data) {
              const returnedTask = data as DailyTask;
              setDailyTasks((prev) => {
                const next = prev.map((t) =>
                  t.id === taskId
                    ? {
                        ...returnedTask,
                        created_at: nowIso,
                        is_bonus: Boolean(task.is_bonus),
                        bounty_started_at: nowIso,
                      }
                    : t
                );
                StorageService.saveDailyTasks(next);
                return next;
              });
            }
          } catch (e) {
            console.warn('[TaskContext] moveTaskToToday error:', e);
          }
        }
      }
    },
    [dailyTasks, supabaseConfig, authUser.isAuthenticated, playSound]
  );

  // Clear All Tasks from Today's Daily List
  const clearAllDailyTasks = useCallback(async () => {
    const today = getTodayDateString();

    // 1. Immediately clear local state and update local cache synchronously
    const remainingTasks = dailyTasks.filter((t) => t.date_assigned !== today);
    setDailyTasks(remainingTasks);
    StorageService.saveDailyTasks(remainingTasks);

    // 2. Call Supabase RPC to delete from database
    if (supabaseConfig.enabled && authUser.isAuthenticated) {
      try {
        await clearAllDailyTasksRPC(supabaseConfig, today);
        await refreshTasks();
      } catch (err) {
        console.warn('[TaskContext] clear_all_daily_tasks RPC error:', err);
      }
    }
  }, [dailyTasks, supabaseConfig, authUser.isAuthenticated, refreshTasks]);

  // Pull Bonus Task helper (Guarded against null/empty result)
  const pullBonusTaskToToday = useCallback(
    async (specificId?: string): Promise<DailyTask | null> => {
      if (poolTasks.length === 0 && !specificId) return null;

      const localToday = getLocalDateString();

      if (supabaseConfig.enabled && authUser.isAuthenticated && !specificId) {
        try {
          const supabase = getSupabaseClient(supabaseConfig);
          if (supabase) {
            const { data: bonusTask, error } = await supabase.rpc('pull_bonus_task', {
              p_today: localToday,
            });
            if (error || !bonusTask || typeof bonusTask !== 'object' || !bonusTask.id) {
              console.log('[TaskContext] No bonus tasks available from cloud.');
              return null;
            }

            const enrichedBonus: DailyTask = {
              ...bonusTask,
              is_bonus: true,
            };

            setBountyMetaMap((prev) => {
              const next = {
                ...prev,
                [enrichedBonus.id]: { is_bonus: true, bounty_started_at: enrichedBonus.created_at },
              };
              StorageService.saveBountyMetaMap(next);
              return next;
            });

            setDailyTasks((prev) => {
              if (prev.some((t) => t.id === enrichedBonus.id)) return prev;
              const updated = [...prev, enrichedBonus];
              StorageService.saveDailyTasks(updated);
              return updated;
            });
            // Preserved: The Bonus Pool acts as an indefinite library/reservoir.
            // Do NOT remove from poolTasks frontend state or pool_tasks table.
            return enrichedBonus;
          }
        } catch (rpcErr) {
          console.warn('[TaskContext] RPC pull_bonus_task fallback:', rpcErr);
        }
      }

      // Client-side fallback or specific task pull (e.g. manual pull)
      let chosenPoolTask: PoolTask;
      if (specificId) {
        const found = poolTasks.find((p) => p.id === specificId);
        if (!found) return null;
        chosenPoolTask = found;
      } else {
        const randomIndex = Math.floor(Math.random() * poolTasks.length);
        chosenPoolTask = poolTasks[randomIndex];
      }

      if (!chosenPoolTask || !chosenPoolTask.id) return null;

      // Preserved: The Bonus Pool acts as an indefinite library/reservoir.
      // Pulling should only instantiate a new copy into dailyTasks.
      const todayDaily = dailyTasks.filter((t) => t.date_assigned === localToday);
      const maxOrder = todayDaily.length > 0 ? Math.max(...todayDaily.map((t) => t.order_index)) : -1;

      const currentActiveUserId = authUser.isAuthenticated ? authUser.id : userId;
      const nowIso = new Date().toISOString();

      const newDailyTask: DailyTask = {
        id: generateUUID(),
        user_id: currentActiveUserId,
        title: chosenPoolTask.title,
        notes: chosenPoolTask.notes || null,
        color: chosenPoolTask.color || 'default',
        completed: false,
        order_index: maxOrder + 1,
        date_assigned: localToday,
        created_at: nowIso,
        is_bonus: true,
        bounty_started_at: nowIso,
      };

      setBountyMetaMap((prev) => {
        const next = {
          ...prev,
          [newDailyTask.id]: { is_bonus: true, bounty_started_at: nowIso },
        };
        StorageService.saveBountyMetaMap(next);
        return next;
      });

      setDailyTasks((prev) => {
        const updated = [...prev, newDailyTask];
        StorageService.saveDailyTasks(updated);
        return updated;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            // Only insert into daily_tasks; DO NOT delete from pool_tasks!
            await client.from('daily_tasks').insert({
              id: newDailyTask.id,
              user_id: newDailyTask.user_id,
              title: newDailyTask.title,
              notes: newDailyTask.notes,
              color: newDailyTask.color,
              completed: newDailyTask.completed,
              order_index: newDailyTask.order_index,
              date_assigned: newDailyTask.date_assigned,
              created_at: newDailyTask.created_at,
            });
          } catch (e) {
            console.warn('Failed to sync pulled bonus task to cloud:', e);
          }
        }
      }

      return newDailyTask;
    },
    [poolTasks, dailyTasks, userId, authUser, supabaseConfig]
  );

  // Toggle Daily Task Completion with DB-First Await, End-Day Guard, and Continuous Bonus Pulls
  const toggleDailyTask = useCallback(
    async (id: string) => {
      const today = getTodayDateString();
      const task = dailyTasks.find((t) => t.id === id);
      if (!task) return;

      const nextCompleted = !task.completed;
      const nowIso = new Date().toISOString();
      const earnedAmount = nextCompleted
        ? calculateTaskBountyValue(task, today, Date.now(), poolTitlesSet)
        : null;

      // Update Bounty Meta & Weekly Bounty Ledger
      setBountyMetaMap((prev) => {
        const existing = prev[id] || {};
        const next = {
          ...prev,
          [id]: {
            ...existing,
            is_bonus: isTaskBonusBounty(task, poolTitlesSet),
            bounty_started_at: task.bounty_started_at || existing.bounty_started_at || task.created_at,
            bounty_earned: earnedAmount,
            completed_at: nextCompleted ? nowIso : null,
          },
        };
        StorageService.saveBountyMetaMap(next);
        return next;
      });

      setBountyLedger((prev) => {
        const filtered = prev.filter((entry) => entry.taskId !== id);
        if (nextCompleted && earnedAmount !== null) {
          const completedDate = task.date_assigned || today;
          const nextLedger: BountyLedgerEntry[] = [
            ...filtered,
            {
              taskId: id,
              title: task.title,
              amount: earnedAmount,
              date: completedDate,
              weekStart: getWeekStartDateString(completedDate),
              completedAt: nowIso,
              isBonus: isTaskBonusBounty(task, poolTitlesSet),
            },
          ];
          StorageService.saveBountyLedger(nextLedger);
          return nextLedger;
        }
        StorageService.saveBountyLedger(filtered);
        return filtered;
      });

      // 1. Optimistic Local State Update
      const updatedTasks = dailyTasks.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: nextCompleted,
              bounty_earned: earnedAmount,
              completed_at: nextCompleted ? nowIso : null,
            }
          : t
      );
      setDailyTasks(updatedTasks);
      StorageService.saveDailyTasks(updatedTasks);
      playSound('complete');

      // 2. Await Supabase Database Write FIRST
      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            const { error } = await client
              .from('daily_tasks')
              .update({ completed: nextCompleted })
              .eq('id', id);

            if (error) {
              console.error('[TaskContext] Error updating task completion in DB:', error);
            }
          } catch (e) {
            console.warn('[TaskContext] Failed to write task completion to cloud:', e);
          }
        }
      }

      // 3. Only AFTER DB write resolves, evaluate if all current tasks for today are complete
      if (nextCompleted) {
        const todayTasks = updatedTasks.filter((t) => t.date_assigned === today);
        const isAllComplete = todayTasks.length > 0 && todayTasks.every((t) => t.completed);

        if (isAllComplete) {
          triggerConfetti();
          playSound('bonus');

          // Update streak
          if (settings.lastCompletedDate !== today) {
            updateSettings({
              lastCompletedDate: today,
              streakCount: (settings.streakCount || 0) + 1,
            });
          }

          // Guard: If day has already been ended by user, DO NOT pull bonus tasks!
          if (settings.day_ended_date === today) {
            console.log('[TaskContext] Day is already ended. Bonus task pull skipped.');
            return;
          }

          // Continuous Bonus Pull via RPC (Guarded against null/empty)
          if (supabaseConfig.enabled && authUser.isAuthenticated) {
            const client = getSupabaseClient(supabaseConfig);
            if (client) {
              try {
                const localToday = getLocalDateString();
                const { data: bonusTask, error } = await client.rpc('pull_bonus_task', {
                  p_today: localToday,
                });
                if (error || !bonusTask || typeof bonusTask !== 'object' || !bonusTask.id) {
                  console.log('[TaskContext] No bonus tasks available in pool.');
                  return;
                }

                const enrichedBonus: DailyTask = {
                  ...bonusTask,
                  is_bonus: true,
                };

                setBountyMetaMap((prev) => {
                  const next = {
                    ...prev,
                    [enrichedBonus.id]: {
                      is_bonus: true,
                      bounty_started_at: enrichedBonus.created_at,
                    },
                  };
                  StorageService.saveBountyMetaMap(next);
                  return next;
                });

                console.log('[TaskContext] Continuous bonus task pulled:', enrichedBonus);
                setDailyTasks((prev) => {
                  if (prev.some((t) => t.id === enrichedBonus.id)) return prev;
                  const next = [...prev, enrichedBonus];
                  StorageService.saveDailyTasks(next);
                  return next;
                });
                // Preserved: The Bonus Pool acts as an indefinite library/reservoir.
                // Pulling only instantiates a new copy into dailyTasks.
                await refreshTasks();
              } catch (rpcErr) {
                console.warn('[TaskContext] pull_bonus_task RPC failed:', rpcErr);
              }
            }
          } else {
            // Local/offline continuous pull
            if (poolTasks.length > 0) {
              const pulled = await pullBonusTaskToToday();
              if (pulled) {
                console.log('[TaskContext] Pulled local bonus task:', pulled);
              }
            }
          }
        }
      }
    },
    [
      dailyTasks,
      settings,
      playSound,
      triggerConfetti,
      updateSettings,
      poolTasks,
      poolTitlesSet,
      pullBonusTaskToToday,
      refreshTasks,
      supabaseConfig,
      authUser.isAuthenticated,
    ]
  );

  // Update Daily Task Title
  const updateDailyTaskTitle = useCallback(
    async (id: string, newTitle: string) => {
      if (!newTitle.trim()) return;
      setDailyTasks((prev) => {
        const next = prev.map((task) => (task.id === id ? { ...task, title: newTitle.trim() } : task));
        StorageService.saveDailyTasks(next);
        return next;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await client.from('daily_tasks').update({ title: newTitle.trim() }).eq('id', id);
          } catch (e) {
            console.warn('Failed to update task title on cloud:', e);
          }
        }
      }
    },
    [supabaseConfig, authUser.isAuthenticated]
  );

  // Update Daily Task Notes
  const updateDailyTaskNotes = useCallback(
    async (id: string, newNotes: string | null) => {
      const formattedNotes = newNotes?.trim() ? newNotes.trim() : null;
      setDailyTasks((prev) => {
        const next = prev.map((task) => (task.id === id ? { ...task, notes: formattedNotes } : task));
        StorageService.saveDailyTasks(next);
        return next;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await client.from('daily_tasks').update({ notes: formattedNotes }).eq('id', id);
          } catch (e) {
            console.warn('Failed to update task notes on cloud:', e);
          }
        }
      }
    },
    [supabaseConfig, authUser.isAuthenticated]
  );

  // Update Daily Task Color
  const updateDailyTaskColor = useCallback(
    async (id: string, newColor: string | null) => {
      const formattedColor = newColor || 'default';
      setDailyTasks((prev) => {
        const next = prev.map((task) => (task.id === id ? { ...task, color: formattedColor } : task));
        StorageService.saveDailyTasks(next);
        return next;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await client.from('daily_tasks').update({ color: formattedColor }).eq('id', id);
          } catch (e) {
            console.warn('Failed to update task color on cloud:', e);
          }
        }
      }
    },
    [supabaseConfig, authUser.isAuthenticated]
  );

  // Delete Daily Task
  const deleteDailyTask = useCallback(
    async (id: string) => {
      setDailyTasks((prev) => {
        const next = prev.filter((task) => task.id !== id);
        StorageService.saveDailyTasks(next);
        return next;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await client.from('daily_tasks').delete().eq('id', id);
          } catch (e) {
            console.warn('Failed to delete daily task from cloud:', e);
          }
        }
      }
    },
    [supabaseConfig, authUser.isAuthenticated]
  );

  // Reorder Daily Tasks
  const reorderDailyTasks = useCallback(
    async (activeId: string, overId: string) => {
      const targetTask = dailyTasks.find((t) => t.id === activeId);
      const targetDate = targetTask?.date_assigned || todayStr;

      const currentTasksInDate = dailyTasks
        .filter((t) => t.date_assigned === targetDate)
        .sort((a, b) => a.order_index - b.order_index);

      const oldIndex = currentTasksInDate.findIndex((t) => t.id === activeId);
      const newIndex = currentTasksInDate.findIndex((t) => t.id === overId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(currentTasksInDate, oldIndex, newIndex).map((task, idx) => ({
        ...task,
        order_index: idx,
      }));

      const otherTasks = dailyTasks.filter((t) => t.date_assigned !== targetDate);
      const allUpdated = [...otherTasks, ...reordered];
      setDailyTasks(allUpdated);
      StorageService.saveDailyTasks(allUpdated);

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            const updates = reordered.map((t) =>
              client.from('daily_tasks').update({ order_index: t.order_index }).eq('id', t.id)
            );
            await Promise.all(updates);
          } catch (e) {
            console.warn('Failed to sync reorder to cloud:', e);
          }
        }
      }
    },
    [dailyTasks, supabaseConfig, authUser.isAuthenticated, todayStr]
  );

  // Add Pool Task (with Notes & Color)
  const addPoolTask = useCallback(
    async (title: string, notes?: string | null, color?: string | null) => {
      if (!title.trim()) return;
      const currentActiveUserId = authUser.isAuthenticated ? authUser.id : userId;

      const newPoolTask: PoolTask = {
        id: generateUUID(),
        user_id: currentActiveUserId,
        title: title.trim(),
        notes: notes?.trim() || null,
        color: color || 'default',
        created_at: new Date().toISOString(),
      };

      setPoolTasks((prev) => {
        const next = [newPoolTask, ...prev];
        StorageService.savePoolTasks(next);
        return next;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await client.from('pool_tasks').insert(newPoolTask);
          } catch (e) {
            console.warn('Failed to insert pool task to cloud:', e);
          }
        }
      }
    },
    [userId, authUser, supabaseConfig]
  );

  // Delete Pool Task
  const deletePoolTask = useCallback(
    async (id: string) => {
      setPoolTasks((prev) => {
        const next = prev.filter((p) => p.id !== id);
        StorageService.savePoolTasks(next);
        return next;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await client.from('pool_tasks').delete().eq('id', id);
          } catch (e) {
            console.warn('Failed to delete pool task from cloud:', e);
          }
        }
      }
    },
    [supabaseConfig, authUser.isAuthenticated]
  );

  // =========================================================================
  // Recurring Tasks CRUD (with Notes & Color)
  // =========================================================================
  const addRecurringTask = useCallback(
    async (
      title: string,
      frequency: 'daily' | 'weekly',
      day_of_week?: number,
      notes?: string | null,
      color?: string | null
    ) => {
      if (!title.trim()) return;
      const currentActiveUserId = authUser.isAuthenticated ? authUser.id : userId;

      const newRecurring: RecurringTask = {
        id: generateUUID(),
        user_id: currentActiveUserId,
        title: title.trim(),
        notes: notes?.trim() || null,
        color: color || 'default',
        frequency,
        day_of_week: frequency === 'weekly' ? (day_of_week ?? 1) : undefined,
        created_at: new Date().toISOString(),
      };

      setRecurringTasks((prev) => {
        const next = [newRecurring, ...prev];
        StorageService.saveRecurringTasks(next);
        return next;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await client.from('recurring_tasks').insert(newRecurring);
          } catch (e) {
            console.warn('[TaskContext] Failed to insert recurring task to cloud:', e);
          }
        }
      }
    },
    [userId, authUser, supabaseConfig]
  );

  const updateRecurringTask = useCallback(
    async (id: string, updates: Partial<RecurringTask>) => {
      setRecurringTasks((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
        StorageService.saveRecurringTasks(next);
        return next;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await client.from('recurring_tasks').update(updates).eq('id', id);
          } catch (e) {
            console.warn('[TaskContext] Failed to update recurring task on cloud:', e);
          }
        }
      }
    },
    [supabaseConfig, authUser.isAuthenticated]
  );

  const deleteRecurringTask = useCallback(
    async (id: string) => {
      setRecurringTasks((prev) => {
        const next = prev.filter((r) => r.id !== id);
        StorageService.saveRecurringTasks(next);
        return next;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await client.from('recurring_tasks').delete().eq('id', id);
          } catch (e) {
            console.warn('[TaskContext] Failed to delete recurring task on cloud:', e);
          }
        }
      }
    },
    [supabaseConfig, authUser.isAuthenticated]
  );

  // Push Recurring Template to Today's Daily List (Preserving Notes & Color, Deduplicated)
  const pushTemplateToToday = useCallback(
    async (
      title: string,
      notes?: string | null,
      color?: string | null
    ): Promise<TaskActionResult> => {
      if (!title.trim()) return { success: false, message: 'Title cannot be empty' };
      const trimmed = title.trim();
      const trimmedNotes = notes?.trim() || null;
      const taskColor = color || 'default';
      const today = todayStr;

      // Deduplication check: check if an incomplete/active task with matching title already exists today
      const isDuplicate = dailyTasks.some(
        (t) =>
          t.date_assigned === today &&
          !t.completed &&
          t.title.trim().toLowerCase() === trimmed.toLowerCase()
      );

      if (isDuplicate) {
        console.log('[TaskContext] Duplicate template push prevented:', trimmed);
        return {
          success: false,
          duplicate: true,
          message: 'Task is already active on today’s list',
        };
      }

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            const { data: newTask, error } = await client.rpc('push_template_to_daily', {
              p_title: trimmed,
              p_notes: trimmedNotes,
              p_color: taskColor,
              p_target_date: todayStr,
            });

            if (error) {
              console.warn('[TaskContext] push_template_to_daily error:', error);
            }

            if (newTask) {
              const nowIso = newTask.created_at || new Date().toISOString();
              const enriched: DailyTask = {
                ...newTask,
                is_bonus: false,
                bounty_started_at: nowIso,
              };
              setBountyMetaMap((prev) => {
                const next = {
                  ...prev,
                  [enriched.id]: { is_bonus: false, bounty_started_at: nowIso },
                };
                StorageService.saveBountyMetaMap(next);
                return next;
              });
              setDailyTasks((prev) => {
                if (prev.some((t) => t.id === enriched.id)) return prev;
                const next = [...prev, enriched];
                StorageService.saveDailyTasks(next);
                return next;
              });
              await refreshTasks();
              return { success: true, task: enriched };
            } else {
              // RPC returned null because task already exists active in database
              return {
                success: false,
                duplicate: true,
                message: 'Task is already active on today’s list',
              };
            }
          } catch (e) {
            console.warn('[TaskContext] push_template_to_daily exception:', e);
          }
        }
      }

      // Local/offline fallback
      return await addDailyTask(trimmed, trimmedNotes, taskColor);
    },
    [dailyTasks, todayStr, supabaseConfig, authUser.isAuthenticated, refreshTasks, addDailyTask]
  );

  // Dismiss Modals
  const dismissRolloverReport = useCallback(() => {
    setRolloverReport(null);
  }, []);

  const dismissCelebrationModal = useCallback(() => {
    setCelebrationModalTask(null);
  }, []);

  // Clear all local data
  const clearAllLocalData = useCallback(() => {
    StorageService.clearAllData();
    const uid = getOrCreateUserId();
    setDailyTasks(StorageService.getDailyTasks(uid));
    setPoolTasks(StorageService.getPoolTasks(uid));
    setRecurringTasks(StorageService.getRecurringTasks(uid));
    setBountyMetaMap({});
    setBountyLedger([]);
    setSettings(StorageService.getSettings());
    setSyncStatus('idle');
    setIsSyncing(false);
    setSyncErrorMessage(null);
  }, []);

  return (
    <TaskContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isLoading,
        isSyncing,
        syncStatus,
        syncErrorMessage,
        dismissSyncError,
        refreshTasks,
        syncWithCloud,
        authUser,
        authLoading,
        authError,
        setAuthError,
        handleSignIn,
        handleSignUp,
        handleSignOut,
        dailyTasks,
        todaysTasks,
        tomorrowTasks,
        todayStr,
        tomorrowStr,
        historyDates,
        getTasksForDate,
        addDailyTask,
        toggleDailyTask,
        updateDailyTaskTitle,
        updateDailyTaskNotes,
        updateDailyTaskColor,
        deleteDailyTask,
        reorderDailyTasks,
        moveTaskToToday,
        clearAllDailyTasks,
        endDay,
        resumeDay,
        isDayEnded,
        poolTasks,
        addPoolTask,
        deletePoolTask,
        pullBonusTaskToToday,
        recurringTasks,
        addRecurringTask,
        updateRecurringTask,
        deleteRecurringTask,
        pushTemplateToToday,
        rolloverReport,
        dismissRolloverReport,
        streakCount: settings.streakCount || 1,
        isTodayAllCompleted,
        todaysCompletionPercentage,
        getTaskBountyValue,
        getTaskMinutesUntilDecay,
        isTaskBonus,
        currentWeekBountyPool,
        todayBountyEarned,
        currentWeekRangeLabel,
        isSundayPoolReset,
        weeklyBountyHistory,
        getDateBountyTotal,
        celebrationModalTask,
        dismissCelebrationModal,
        triggerConfetti,
        settings,
        updateSettings,
        supabaseConfig,
        updateSupabaseConfig,
        clearAllLocalData,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
