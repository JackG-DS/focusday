'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
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
} from '@/lib/types';
import {
  StorageService,
  getTodayDateString,
  generateUUID,
  getOrCreateUserId,
} from '@/lib/storage';
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

  // Daily Tasks
  dailyTasks: DailyTask[];
  todaysTasks: DailyTask[];
  historyDates: string[];
  getTasksForDate: (date: string) => DailyTask[];
  addDailyTask: (title: string, notes?: string | null, color?: string | null, date?: string) => Promise<TaskActionResult>;
  toggleDailyTask: (id: string) => Promise<void>;
  updateDailyTaskTitle: (id: string, newTitle: string) => Promise<void>;
  updateDailyTaskNotes: (id: string, newNotes: string | null) => Promise<void>;
  updateDailyTaskColor: (id: string, newColor: string | null) => Promise<void>;
  deleteDailyTask: (id: string) => Promise<void>;
  reorderDailyTasks: (activeId: string, overId: string) => Promise<void>;
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
  const [settings, setSettings] = useState<UserSettings>(StorageService.getSettings());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(StorageService.getSupabaseConfig());
  const [rolloverReport, setRolloverReport] = useState<RolloverReport | null>(null);
  const [celebrationModalTask, setCelebrationModalTask] = useState<DailyTask | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);

  const todayStr = useMemo(() => getTodayDateString(), []);

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

  // Check if current time has passed daily reset threshold
  const checkShouldReset = useCallback((resetTime: string = '04:00', lastResetDate?: string): boolean => {
    const now = new Date();
    const today = getTodayDateString();

    if (lastResetDate === today) {
      return false;
    }

    const [resetHStr, resetMStr] = (resetTime || '04:00').split(':');
    const resetH = parseInt(resetHStr, 10) || 4;
    const resetM = parseInt(resetMStr, 10) || 0;

    const currentH = now.getHours();
    const currentM = now.getMinutes();

    return currentH > resetH || (currentH === resetH && currentM >= resetM);
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
  const refreshTasks = useCallback(async () => {
    if (!supabaseConfig.enabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      setIsSyncing(false);
      setSyncStatus('idle');
      return;
    }

    const targetUserId = authUser.isAuthenticated ? authUser.id : userId;
    if (!targetUserId || targetUserId === 'local-user') {
      setIsSyncing(false);
      setSyncStatus('idle');
      return;
    }

    const client = getSupabaseClient(supabaseConfig);
    if (!client) {
      setIsSyncing(false);
      setSyncStatus('error');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncErrorMessage(null);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Sync timeout (5s). Database unreachable.')), 5000)
    );

    try {
      await Promise.race([
        (async () => {
          const today = getTodayDateString();

          // 1. Fetch Remote User Settings
          try {
            const { data: userSettingsData } = await client
              .from('user_settings')
              .select('*')
              .eq('user_id', targetUserId)
              .maybeSingle();

            if (userSettingsData) {
              setSettings((prev) => {
                const merged: UserSettings = {
                  ...prev,
                  reset_time: userSettingsData.reset_time || prev.reset_time || '04:00',
                  last_reset_date: userSettingsData.last_reset_date || prev.last_reset_date || '',
                  day_ended_date: userSettingsData.day_ended_date || prev.day_ended_date || null,
                };
                StorageService.saveSettings(merged);
                return merged;
              });
            }
          } catch (settingsErr) {
            console.warn('[TaskContext] Optional user_settings fetch skipped:', settingsErr);
          }

          // 2. Check Daily Auto-Reset Threshold
          const currentResetTime = settings.reset_time || '04:00';
          const currentLastReset = settings.last_reset_date || '';

          if (checkShouldReset(currentResetTime, currentLastReset)) {
            console.log('[TaskContext] Daily reset threshold reached. Clearing completed tasks...');
            try {
              await clearCompletedTasksRPC(supabaseConfig);
              updateSettings({ last_reset_date: today, day_ended_date: null });
            } catch (resetErr) {
              console.warn('[TaskContext] clear_completed_tasks RPC error:', resetErr);
            }
          }

          // 3. Fetch Tasks Directly from Supabase (Strictly Read Only, Never Re-insert Old Stale Items)
          const [dailyRes, poolRes, recurringRes] = await Promise.all([
            client.from('daily_tasks').select('*').order('order_index', { ascending: true }),
            client.from('pool_tasks').select('*').order('created_at', { ascending: false }),
            client.from('recurring_tasks').select('*').order('created_at', { ascending: false }),
          ]);

          if (dailyRes.error) {
            console.error('[TaskContext] Fetch error (daily_tasks):', dailyRes.error);
            throw new Error(dailyRes.error.message);
          }
          if (poolRes.error) {
            console.error('[TaskContext] Fetch error (pool_tasks):', poolRes.error);
            throw new Error(poolRes.error.message);
          }

          const cloudDaily: DailyTask[] = dailyRes.data || [];
          const cloudPool: PoolTask[] = poolRes.data || [];
          const cloudRecurring: RecurringTask[] = recurringRes?.data || [];

          console.log('[TaskContext] Tasks fetched from cloud:', {
            dailyCount: cloudDaily.length,
            poolCount: cloudPool.length,
            recurringCount: cloudRecurring.length,
          });

          // Strictly overwrite state and sync local cache with truth from database
          setDailyTasks(cloudDaily);
          StorageService.saveDailyTasks(cloudDaily);

          setPoolTasks(cloudPool);
          StorageService.savePoolTasks(cloudPool);

          if (!recurringRes.error) {
            setRecurringTasks(cloudRecurring);
            StorageService.saveRecurringTasks(cloudRecurring);
          }

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
    const today = getTodayDateString();

    // Auto-Reset Check on Local Storage
    if (checkShouldReset(loadedSettings.reset_time, loadedSettings.last_reset_date)) {
      loadedDaily = loadedDaily.filter((t) => !t.completed);
      loadedSettings.last_reset_date = today;
      loadedSettings.day_ended_date = null; // Clear day ended on rollover
      StorageService.saveDailyTasks(loadedDaily);
      StorageService.saveSettings(loadedSettings);
    }

    // Reset day_ended_date if it's from a previous day
    if (loadedSettings.day_ended_date && loadedSettings.day_ended_date !== today) {
      loadedSettings.day_ended_date = null;
      StorageService.saveSettings(loadedSettings);
    }

    // Local Generation of Due Recurring Tasks for Today:
    // IMPORTANT: If Supabase is configured, rely exclusively on `generate_due_recurring_tasks` RPC on cloud init
    // to prevent redundant client-side insertion loops that bypass database deduplication.
    const isCloudEnabled = Boolean(loadedSupabase.enabled && loadedSupabase.url && loadedSupabase.anonKey);
    if (!isCloudEnabled) {
      const currentDow = new Date().getDay();
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
          loadedDaily.push({
            id: generateUUID(),
            user_id: localUid,
            title: r.title,
            notes: r.notes || null,
            color: r.color || 'default',
            completed: false,
            order_index: maxOrder,
            date_assigned: today,
            created_at: new Date().toISOString(),
          });
          existingActiveTitles.add(r.title.toLowerCase().trim());
        }
      }
    }

    // Local Midnight Rollover
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

    setDailyTasks(loadedDaily);
    setPoolTasks(loadedPool);
    setRecurringTasks(loadedRecurring);
    setSettings(loadedSettings);
    setSupabaseConfig(loadedSupabase);
    setIsClientReady(true);

    // 2. Check Supabase Auth Session on Mount
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

            // Execute cloud daily generation & rollover ONCE on initial daily mount
            try {
              await generateDueRecurringTasksRPC(loadedSupabase);
              await rolloverIncompleteTasksRPC(loadedSupabase);
            } catch (initRpcErr) {
              console.warn('[TaskContext] Initial daily RPC init skipped:', initRpcErr);
            }
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

  // Fetch Once When User Authenticates or Session is Active
  useEffect(() => {
    if (authUser.isAuthenticated && authUser.id && authUser.id !== 'local-user') {
      refreshTasks();
    }
  }, [authUser.id, authUser.isAuthenticated]);

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

        try {
          await generateDueRecurringTasksRPC(supabaseConfig);
        } catch {}

        return true;
      }
      return false;
    },
    [supabaseConfig]
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

        try {
          await generateDueRecurringTasksRPC(supabaseConfig);
        } catch {}

        return true;
      }
      return false;
    },
    [supabaseConfig]
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

  // Add Daily Task (with Deduplication against active tasks)
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

      // Deduplication check: check if an active/incomplete task with matching title already exists
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
          message: 'Task is already active on today’s list',
        };
      }

      const existingInDate = dailyTasks.filter((t) => t.date_assigned === targetDate);
      const maxOrder = existingInDate.length > 0 
        ? Math.max(...existingInDate.map((t) => t.order_index)) 
        : -1;

      const currentActiveUserId = authUser.isAuthenticated ? authUser.id : userId;

      const newTask: DailyTask = {
        id: generateUUID(),
        user_id: currentActiveUserId,
        title: trimmedTitle,
        notes: notes?.trim() || null,
        color: color || 'default',
        completed: false,
        order_index: maxOrder + 1,
        date_assigned: targetDate,
        created_at: new Date().toISOString(),
      };

      setDailyTasks((prev) => {
        const updated = [...prev, newTask];
        StorageService.saveDailyTasks(updated);
        return updated;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await client.from('daily_tasks').insert(newTask);
          } catch (e) {
            console.warn('Failed to insert daily task to cloud:', e);
          }
        }
      }

      return { success: true, task: newTask };
    },
    [dailyTasks, userId, authUser, supabaseConfig]
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
        await clearAllDailyTasksRPC(supabaseConfig);
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

      if (supabaseConfig.enabled && authUser.isAuthenticated && !specificId) {
        try {
          const { data: bonusTask, error } = await pullBonusTaskRPC(supabaseConfig);
          if (error || !bonusTask || typeof bonusTask !== 'object' || !bonusTask.id) {
            console.log('[TaskContext] No bonus tasks available from cloud.');
            return null;
          }

          setDailyTasks((prev) => {
            if (prev.some((t) => t.id === bonusTask.id)) return prev;
            const updated = [...prev, bonusTask];
            StorageService.saveDailyTasks(updated);
            return updated;
          });
          setPoolTasks((prev) => {
            const updated = prev.filter((p) => p.title !== bonusTask.title && p.id !== bonusTask.id);
            StorageService.savePoolTasks(updated);
            return updated;
          });
          return bonusTask;
        } catch (rpcErr) {
          console.warn('[TaskContext] RPC pull_bonus_task fallback:', rpcErr);
        }
      }

      // Client-side fallback
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

      const updatedPool = poolTasks.filter((p) => p.id !== chosenPoolTask.id);
      setPoolTasks(updatedPool);
      StorageService.savePoolTasks(updatedPool);

      const today = getTodayDateString();
      const todayDaily = dailyTasks.filter((t) => t.date_assigned === today);
      const maxOrder = todayDaily.length > 0 ? Math.max(...todayDaily.map((t) => t.order_index)) : -1;

      const currentActiveUserId = authUser.isAuthenticated ? authUser.id : userId;

      const newDailyTask: DailyTask = {
        id: generateUUID(),
        user_id: currentActiveUserId,
        title: chosenPoolTask.title,
        notes: chosenPoolTask.notes || null,
        color: chosenPoolTask.color || 'default',
        completed: false,
        order_index: maxOrder + 1,
        date_assigned: today,
        created_at: new Date().toISOString(),
      };

      setDailyTasks((prev) => {
        const updated = [...prev, newDailyTask];
        StorageService.saveDailyTasks(updated);
        return updated;
      });

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          try {
            await Promise.all([
              client.from('pool_tasks').delete().eq('id', chosenPoolTask.id),
              client.from('daily_tasks').insert(newDailyTask),
            ]);
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

      // 1. Optimistic Local State Update
      const updatedTasks = dailyTasks.map((t) =>
        t.id === id ? { ...t, completed: nextCompleted } : t
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
                const { data: bonusTask, error } = await client.rpc('pull_bonus_task');
                if (error || !bonusTask || typeof bonusTask !== 'object' || !bonusTask.id) {
                  console.log('[TaskContext] No bonus tasks available in pool.');
                  return;
                }

                console.log('[TaskContext] Continuous bonus task pulled:', bonusTask);
                setDailyTasks((prev) => {
                  if (prev.some((t) => t.id === bonusTask.id)) return prev;
                  const next = [...prev, bonusTask];
                  StorageService.saveDailyTasks(next);
                  return next;
                });
                setPoolTasks((prev) => {
                  const next = prev.filter((p) => p.title !== bonusTask.title && p.id !== bonusTask.id);
                  StorageService.savePoolTasks(next);
                  return next;
                });
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
      const today = getTodayDateString();
      const currentTodayTasks = dailyTasks
        .filter((t) => t.date_assigned === today)
        .sort((a, b) => a.order_index - b.order_index);

      const oldIndex = currentTodayTasks.findIndex((t) => t.id === activeId);
      const newIndex = currentTodayTasks.findIndex((t) => t.id === overId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(currentTodayTasks, oldIndex, newIndex).map((task, idx) => ({
        ...task,
        order_index: idx,
      }));

      const otherTasks = dailyTasks.filter((t) => t.date_assigned !== today);
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
    [dailyTasks, supabaseConfig, authUser.isAuthenticated]
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
      const today = getTodayDateString();

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
            });

            if (error) {
              console.warn('[TaskContext] push_template_to_daily error:', error);
            }

            if (newTask) {
              setDailyTasks((prev) => {
                if (prev.some((t) => t.id === newTask.id)) return prev;
                const next = [...prev, newTask];
                StorageService.saveDailyTasks(next);
                return next;
              });
              await refreshTasks();
              return { success: true, task: newTask };
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
    [dailyTasks, supabaseConfig, authUser.isAuthenticated, refreshTasks, addDailyTask]
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
        historyDates,
        getTasksForDate,
        addDailyTask,
        toggleDailyTask,
        updateDailyTaskTitle,
        updateDailyTaskNotes,
        updateDailyTaskColor,
        deleteDailyTask,
        reorderDailyTasks,
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
