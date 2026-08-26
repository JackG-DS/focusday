'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { arrayMove } from '@dnd-kit/sortable';
import {
  DailyTask,
  PoolTask,
  UserSettings,
  SupabaseConfig,
  SyncStatus,
  ActiveTab,
  RolloverReport,
  AuthUserState,
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
} from '@/lib/supabaseClient';

interface TaskContextType {
  // Navigation & View
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Loading & Sync States
  isLoading: boolean;
  isSyncing: boolean;
  isConnected: boolean;
  syncStatus: SyncStatus;
  syncErrorMessage: string | null;
  dismissSyncError: () => void;
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
  addDailyTask: (title: string, date?: string) => Promise<void>;
  toggleDailyTask: (id: string) => Promise<void>;
  updateDailyTaskTitle: (id: string, newTitle: string) => Promise<void>;
  deleteDailyTask: (id: string) => Promise<void>;
  reorderDailyTasks: (activeId: string, overId: string) => Promise<void>;

  // Bonus Pool Tasks
  poolTasks: PoolTask[];
  addPoolTask: (title: string) => Promise<void>;
  deletePoolTask: (id: string) => Promise<void>;
  pullBonusTaskToToday: (id?: string) => Promise<DailyTask | null>;

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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [poolTasks, setPoolTasks] = useState<PoolTask[]>([]);
  const [settings, setSettings] = useState<UserSettings>(StorageService.getSettings());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(StorageService.getSupabaseConfig());
  const [rolloverReport, setRolloverReport] = useState<RolloverReport | null>(null);
  const [celebrationModalTask, setCelebrationModalTask] = useState<DailyTask | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);

  const todayStr = useMemo(() => getTodayDateString(), []);
  const isFetchingRef = useRef<boolean>(false);

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

  // =========================================================================
  // 2. Transient Fetch Function with guaranteed finally block & full logging
  // =========================================================================
  const fetchTasksFromCloud = useCallback(async (targetUserId: string) => {
    if (isFetchingRef.current) return;
    if (!supabaseConfig.enabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      setIsLoading(false);
      setIsSyncing(false);
      return;
    }

    const client = getSupabaseClient(supabaseConfig);
    if (!client) {
      setIsLoading(false);
      setIsSyncing(false);
      return;
    }

    isFetchingRef.current = true;
    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncErrorMessage(null);

    // 5-second timeout race to prevent infinite hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Cloud sync timeout (5s). Database unreachable.')), 5000)
    );

    try {
      await Promise.race([
        (async () => {
          // Attempt server-side rollover RPC
          try {
            await rolloverIncompleteTasksRPC(supabaseConfig);
          } catch (rpcErr) {
            console.warn('[TaskContext] Optional rollover RPC skip:', rpcErr);
          }

          // Fetch daily_tasks and pool_tasks for current user
          const [dailyRes, poolRes] = await Promise.all([
            client.from('daily_tasks').select('*').order('order_index', { ascending: true }),
            client.from('pool_tasks').select('*').order('created_at', { ascending: false }),
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

          console.log('[TaskContext] Tasks fetched:', {
            dailyCount: cloudDaily.length,
            poolCount: cloudPool.length,
            daily: cloudDaily,
            pool: cloudPool,
          });

          // If cloud has data, sync into state
          if (cloudDaily.length > 0) {
            setDailyTasks(cloudDaily);
          } else if (dailyTasks.length > 0) {
            const toUpload = dailyTasks.map((t) => ({ ...t, user_id: targetUserId }));
            await client.from('daily_tasks').insert(toUpload);
          }

          if (cloudPool.length > 0) {
            setPoolTasks(cloudPool);
          } else if (poolTasks.length > 0) {
            const toUpload = poolTasks.map((t) => ({ ...t, user_id: targetUserId }));
            await client.from('pool_tasks').insert(toUpload);
          }

          setSyncStatus('synced');
          setIsConnected(true);
          setSyncErrorMessage(null);
        })(),
        timeoutPromise,
      ]);
    } catch (err: any) {
      console.error('[TaskContext] Fetch error:', err);
      setSyncStatus('error');
      setSyncErrorMessage(err?.message || 'Database unreachable. Running in local offline mode.');
    } finally {
      // ALWAYS Clear the Spinner immediately in finally block
      setIsSyncing(false);
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [supabaseConfig, dailyTasks, poolTasks]);

  // Sync with Cloud alias
  const syncWithCloud = useCallback(async () => {
    if (authUser.isAuthenticated && authUser.id && authUser.id !== 'local-user') {
      await fetchTasksFromCloud(authUser.id);
    } else {
      setIsSyncing(false);
      setIsLoading(false);
      setSyncStatus('idle');
    }
  }, [authUser, fetchTasksFromCloud]);

  // =========================================================================
  // 1. Guard Auth & Loading on Mount
  // =========================================================================
  useEffect(() => {
    const localUid = getOrCreateUserId();
    setUserId(localUid);

    // 1. Load Local State synchronously
    let loadedDaily = StorageService.getDailyTasks(localUid);
    const loadedPool = StorageService.getPoolTasks(localUid);
    const loadedSettings = StorageService.getSettings();
    const loadedSupabase = StorageService.getSupabaseConfig();
    const today = getTodayDateString();

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
    setSettings(loadedSettings);
    setSupabaseConfig(loadedSupabase);
    setIsClientReady(true);

    // 2. Check Supabase Auth Session on Mount
    if (loadedSupabase.enabled && loadedSupabase.url && loadedSupabase.anonKey) {
      getAuthSession(loadedSupabase)
        .then((session) => {
          if (session?.user) {
            console.log('[TaskContext] User session:', session.user.id);
            setAuthUser({
              id: session.user.id,
              email: session.user.email || null,
              isAuthenticated: true,
            });
            setUserId(session.user.id);
            setIsConnected(true);
            fetchTasksFromCloud(session.user.id);
          } else {
            console.log('[TaskContext] No active user session, using local offline storage.');
            setAuthUser({
              id: localUid,
              email: null,
              isAuthenticated: false,
            });
            setUserId(localUid);
            setIsConnected(false);
            setIsLoading(false);
            setIsSyncing(false);
            setSyncStatus('idle');
          }
        })
        .catch((err) => {
          console.error('[TaskContext] Auth session error:', err);
          setIsConnected(false);
          setIsLoading(false);
          setIsSyncing(false);
          setSyncStatus('idle');
        });
    } else {
      console.log('[TaskContext] Supabase not configured or disabled. Operating in local mode.');
      setIsConnected(false);
      setIsLoading(false);
      setIsSyncing(false);
      setSyncStatus('idle');
    }
  }, []);

  // Listen to Auth State Changes (Sign in / Sign out)
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
          setIsConnected(true);
          fetchTasksFromCloud(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          const localUid = getOrCreateUserId();
          setAuthUser({
            id: localUid,
            email: null,
            isAuthenticated: false,
          });
          setUserId(localUid);
          setIsConnected(false);
          setSyncStatus('idle');
          setIsSyncing(false);
          setIsLoading(false);
          setSyncErrorMessage(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabaseConfig, fetchTasksFromCloud]);

  // =========================================================================
  // 4. Decoupled Realtime Subscription with Explicit Status Handling
  // =========================================================================
  useEffect(() => {
    if (!supabaseConfig.enabled || !authUser.isAuthenticated || !authUser.id || authUser.id === 'local-user') {
      setIsConnected(false);
      return;
    }

    const client = getSupabaseClient(supabaseConfig);
    if (!client) return;

    console.log('[TaskContext] Subscribing to Realtime channel public:tasks for user:', authUser.id);

    const channel = client
      .channel('public:tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_tasks',
          filter: `user_id=eq.${authUser.id}`,
        },
        (payload) => {
          console.log('[TaskContext] Realtime daily_tasks change:', payload.eventType);
          syncWithCloud();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pool_tasks',
          filter: `user_id=eq.${authUser.id}`,
        },
        (payload) => {
          console.log('[TaskContext] Realtime pool_tasks change:', payload.eventType);
          syncWithCloud();
        }
      )
      .subscribe((status) => {
        console.log('[TaskContext] Realtime channel status:', status);
        if (status === 'SUBSCRIBED') {
          setIsSyncing(false);
          setIsConnected(true);
          setSyncStatus('synced');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsSyncing(false);
          setIsConnected(false);
        }
      });

    return () => {
      console.log('[TaskContext] Unsubscribing from Realtime channel public:tasks');
      client.removeChannel(channel);
    };
  }, [supabaseConfig.enabled, authUser.isAuthenticated, authUser.id, syncWithCloud]);

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

  // Save Settings to Local Storage
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      StorageService.saveSettings(updated);
      return updated;
    });
  }, []);

  // Network Status Monitor
  useEffect(() => {
    const handleOnline = () => {
      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        syncWithCloud();
      } else {
        setSyncStatus('idle');
      }
    };
    const handleOffline = () => {
      setSyncStatus('offline');
      setIsConnected(false);
      setIsSyncing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setSyncStatus('offline');
      setIsConnected(false);
      setIsSyncing(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [supabaseConfig.enabled, authUser.isAuthenticated, syncWithCloud]);

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
        setIsConnected(true);
        fetchTasksFromCloud(result.user.id);
        return true;
      }
      return false;
    },
    [supabaseConfig, fetchTasksFromCloud]
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
        setIsConnected(true);
        fetchTasksFromCloud(result.user.id);
        return true;
      }
      return false;
    },
    [supabaseConfig, fetchTasksFromCloud]
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
    setIsConnected(false);
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
        fetchTasksFromCloud(authUser.id);
      } else {
        setSyncStatus('idle');
        setIsSyncing(false);
      }
    } else {
      setSyncStatus('idle');
      setIsConnected(false);
      setIsSyncing(false);
      setSyncErrorMessage(null);
    }
  }, [authUser, fetchTasksFromCloud]);

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

  // Add Daily Task (Optimistic UI + Transient Cloud Insert)
  const addDailyTask = useCallback(
    async (title: string, date?: string) => {
      if (!title.trim()) return;
      const targetDate = date || getTodayDateString();
      const existingInDate = dailyTasks.filter((t) => t.date_assigned === targetDate);
      const maxOrder = existingInDate.length > 0 
        ? Math.max(...existingInDate.map((t) => t.order_index)) 
        : -1;

      const currentActiveUserId = authUser.isAuthenticated ? authUser.id : userId;

      const newTask: DailyTask = {
        id: generateUUID(),
        user_id: currentActiveUserId,
        title: title.trim(),
        completed: false,
        order_index: maxOrder + 1,
        date_assigned: targetDate,
        created_at: new Date().toISOString(),
      };

      setDailyTasks((prev) => [...prev, newTask]);

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
    },
    [dailyTasks, userId, authUser, supabaseConfig]
  );

  // Pull Bonus Task helper
  const pullBonusTaskToToday = useCallback(
    async (specificId?: string): Promise<DailyTask | null> => {
      if (poolTasks.length === 0 && !specificId) return null;

      // 1. If authenticated and pulling random bonus task, use pull_bonus_task RPC
      if (supabaseConfig.enabled && authUser.isAuthenticated && !specificId) {
        try {
          const { data: bonusTask, error } = await pullBonusTaskRPC(supabaseConfig);
          if (!error && bonusTask) {
            setDailyTasks((prev) => [...prev, bonusTask]);
            setPoolTasks((prev) => prev.filter((p) => p.title !== bonusTask.title));
            return bonusTask;
          }
        } catch (rpcErr) {
          console.warn('[TaskContext] RPC pull_bonus_task fallback:', rpcErr);
        }
      }

      // 2. Client-side execution fallback
      let chosenPoolTask: PoolTask;
      if (specificId) {
        const found = poolTasks.find((p) => p.id === specificId);
        if (!found) return null;
        chosenPoolTask = found;
      } else {
        const randomIndex = Math.floor(Math.random() * poolTasks.length);
        chosenPoolTask = poolTasks[randomIndex];
      }

      const updatedPool = poolTasks.filter((p) => p.id !== chosenPoolTask.id);
      setPoolTasks(updatedPool);

      const today = getTodayDateString();
      const todayDaily = dailyTasks.filter((t) => t.date_assigned === today);
      const maxOrder = todayDaily.length > 0 ? Math.max(...todayDaily.map((t) => t.order_index)) : -1;

      const currentActiveUserId = authUser.isAuthenticated ? authUser.id : userId;

      const newDailyTask: DailyTask = {
        id: generateUUID(),
        user_id: currentActiveUserId,
        title: chosenPoolTask.title,
        completed: false,
        order_index: maxOrder + 1,
        date_assigned: today,
        created_at: new Date().toISOString(),
      };

      setDailyTasks((prev) => [...prev, newDailyTask]);

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

  // Toggle Daily Task Completion
  const toggleDailyTask = useCallback(
    async (id: string) => {
      let newlyCompletedTask: DailyTask | undefined;
      let shouldTriggerBonus = false;

      const today = getTodayDateString();

      setDailyTasks((prev) => {
        const nextTasks = prev.map((task) => {
          if (task.id === id) {
            const nextCompleted = !task.completed;
            const updated = { ...task, completed: nextCompleted };
            if (nextCompleted) {
              newlyCompletedTask = updated;
            }
            return updated;
          }
          return task;
        });

        const currentToday = nextTasks.filter((t) => t.date_assigned === today);
        const allCompletedNow = currentToday.length > 0 && currentToday.every((t) => t.completed);
        const alreadyTriggeredToday = settings.bonusTriggeredDates.includes(today);

        if (allCompletedNow && !alreadyTriggeredToday && newlyCompletedTask) {
          shouldTriggerBonus = true;
        }

        return nextTasks;
      });

      playSound('complete');

      if (shouldTriggerBonus) {
        triggerConfetti();
        playSound('bonus');

        updateSettings({
          bonusTriggeredDates: [...settings.bonusTriggeredDates, today],
          lastCompletedDate: today,
          streakCount: settings.streakCount + 1,
        });

        if (poolTasks.length > 0) {
          setTimeout(async () => {
            const unlockedTask = await pullBonusTaskToToday();
            if (unlockedTask) {
              setCelebrationModalTask(unlockedTask);
            }
          }, 400);
        }
      }

      if (supabaseConfig.enabled && authUser.isAuthenticated) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          const taskToUpdate = dailyTasks.find((t) => t.id === id);
          if (taskToUpdate) {
            try {
              await client
                .from('daily_tasks')
                .update({ completed: !taskToUpdate.completed })
                .eq('id', id);
            } catch (e) {
              console.warn('Failed to update task completion on cloud:', e);
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
      supabaseConfig,
      authUser.isAuthenticated,
    ]
  );

  // Update Daily Task Title
  const updateDailyTaskTitle = useCallback(
    async (id: string, newTitle: string) => {
      if (!newTitle.trim()) return;
      setDailyTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, title: newTitle.trim() } : task))
      );

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

  // Delete Daily Task
  const deleteDailyTask = useCallback(
    async (id: string) => {
      setDailyTasks((prev) => prev.filter((task) => task.id !== id));

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

  // Add Pool Task
  const addPoolTask = useCallback(
    async (title: string) => {
      if (!title.trim()) return;
      const currentActiveUserId = authUser.isAuthenticated ? authUser.id : userId;

      const newPoolTask: PoolTask = {
        id: generateUUID(),
        user_id: currentActiveUserId,
        title: title.trim(),
        created_at: new Date().toISOString(),
      };

      setPoolTasks((prev) => [newPoolTask, ...prev]);

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
      setPoolTasks((prev) => prev.filter((p) => p.id !== id));

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
    const today = getTodayDateString();
    setDailyTasks(StorageService.getDailyTasks(uid));
    setPoolTasks(StorageService.getPoolTasks(uid));
    setSettings(StorageService.getSettings());
    setIsConnected(false);
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
        isConnected,
        syncStatus,
        syncErrorMessage,
        dismissSyncError,
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
        deleteDailyTask,
        reorderDailyTasks,
        poolTasks,
        addPoolTask,
        deletePoolTask,
        pullBonusTaskToToday,
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
