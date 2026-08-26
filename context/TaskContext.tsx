'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
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

  // Settings & Cloud Sync
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  supabaseConfig: SupabaseConfig;
  updateSupabaseConfig: (config: SupabaseConfig) => Promise<void>;
  syncStatus: SyncStatus;
  syncWithCloud: () => Promise<void>;
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

  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [poolTasks, setPoolTasks] = useState<PoolTask[]>([]);
  const [settings, setSettings] = useState<UserSettings>(StorageService.getSettings());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(StorageService.getSupabaseConfig());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
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
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'bonus') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {
      // AudioContext unavailable
    }
  }, [settings.soundEnabled]);

  // Initial Load & Midnight Rollover Execution
  useEffect(() => {
    const localUid = getOrCreateUserId();
    setUserId(localUid);
    setAuthUser({
      id: localUid,
      email: null,
      isAuthenticated: false,
    });

    let loadedDaily = StorageService.getDailyTasks(localUid);
    const loadedPool = StorageService.getPoolTasks(localUid);
    const loadedSettings = StorageService.getSettings();
    const loadedSupabase = StorageService.getSupabaseConfig();

    const today = getTodayDateString();

    // Perform Automatic Midnight Rollover
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

    // Evaluate Streak
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
  }, []);

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

  // Cloud Sync Handler (Scoped to authenticated user or userId)
  const syncWithCloud = useCallback(async () => {
    if (!supabaseConfig.enabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      setSyncStatus('idle');
      return;
    }

    const client = getSupabaseClient(supabaseConfig);
    if (!client) {
      setSyncStatus('error');
      return;
    }

    try {
      setSyncStatus('syncing');

      // 1. Rollover overdue tasks on app load via RPC
      if (authUser.isAuthenticated) {
        try {
          await rolloverIncompleteTasksRPC(supabaseConfig);
        } catch {
          // If RPC is not created yet, client-side rollover continues
        }
      }

      // 2. Fetch cloud tasks for current user
      const [dailyRes, poolRes] = await Promise.all([
        client.from('daily_tasks').select('*').order('order_index', { ascending: true }),
        client.from('pool_tasks').select('*').order('created_at', { ascending: false }),
      ]);

      if (dailyRes.error || poolRes.error) {
        console.error('Supabase query error:', dailyRes.error || poolRes.error);
        setSyncStatus('error');
        return;
      }

      const cloudDaily: DailyTask[] = dailyRes.data || [];
      const cloudPool: PoolTask[] = poolRes.data || [];

      // Merge Strategy: If cloud is empty and local has items, upload local items with current user_id
      if (cloudDaily.length === 0 && dailyTasks.length > 0 && authUser.isAuthenticated) {
        const tasksToUpload = dailyTasks.map((t) => ({ ...t, user_id: authUser.id }));
        await client.from('daily_tasks').insert(tasksToUpload);
      } else if (cloudDaily.length > 0) {
        setDailyTasks(cloudDaily);
      }

      if (cloudPool.length === 0 && poolTasks.length > 0 && authUser.isAuthenticated) {
        const tasksToUpload = poolTasks.map((t) => ({ ...t, user_id: authUser.id }));
        await client.from('pool_tasks').insert(tasksToUpload);
      } else if (cloudPool.length > 0) {
        setPoolTasks(cloudPool);
      }

      setSyncStatus('synced');
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus('error');
    }
  }, [supabaseConfig, authUser, dailyTasks, poolTasks]);

  // Listen to Supabase Auth State Changes
  useEffect(() => {
    if (!supabaseConfig.enabled) return;
    const client = getSupabaseClient(supabaseConfig);
    if (!client) return;

    // Check initial user
    client.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAuthUser({
          id: data.user.id,
          email: data.user.email || null,
          isAuthenticated: true,
        });
        setUserId(data.user.id);
        syncWithCloud();
      }
    });

    const { data: authListener } = client.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setAuthUser({
            id: session.user.id,
            email: session.user.email || null,
            isAuthenticated: true,
          });
          setUserId(session.user.id);
          syncWithCloud();
        } else if (event === 'SIGNED_OUT') {
          const localUid = getOrCreateUserId();
          setAuthUser({
            id: localUid,
            email: null,
            isAuthenticated: false,
          });
          setUserId(localUid);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabaseConfig, syncWithCloud]);

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
        setTimeout(() => syncWithCloud(), 300);
        return true;
      }
      return false;
    },
    [supabaseConfig, syncWithCloud]
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
        setTimeout(() => syncWithCloud(), 300);
        return true;
      }
      return false;
    },
    [supabaseConfig, syncWithCloud]
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
  }, [supabaseConfig]);

  // Update Supabase Config
  const updateSupabaseConfig = useCallback(async (newConfig: SupabaseConfig) => {
    setSupabaseConfig(newConfig);
    StorageService.saveSupabaseConfig(newConfig);
    if (newConfig.enabled && newConfig.url && newConfig.anonKey) {
      const client = getSupabaseClient(newConfig);
      if (client) {
        setSyncStatus('syncing');
        try {
          const { error } = await client.from('daily_tasks').select('id').limit(1);
          if (error) {
            setSyncStatus('error');
          } else {
            setSyncStatus('synced');
            syncWithCloud();
          }
        } catch {
          setSyncStatus('error');
        }
      }
    } else {
      setSyncStatus('idle');
    }
  }, [syncWithCloud]);

  // Realtime Subscription Setup for Supabase
  useEffect(() => {
    if (!supabaseConfig.enabled) return;
    const client = getSupabaseClient(supabaseConfig);
    if (!client) return;

    const channel = client
      .channel('antigravity-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_tasks' },
        () => {
          syncWithCloud();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pool_tasks' },
        () => {
          syncWithCloud();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [supabaseConfig, syncWithCloud]);

  // Network Status Monitor (Online/Offline)
  useEffect(() => {
    const handleOnline = () => {
      if (supabaseConfig.enabled) {
        syncWithCloud();
      }
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setSyncStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [supabaseConfig.enabled, syncWithCloud]);

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

  // Add Daily Task
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

      if (supabaseConfig.enabled) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          await client.from('daily_tasks').insert(newTask);
        }
      }
    },
    [dailyTasks, userId, authUser, supabaseConfig]
  );

  // Pull Bonus Task helper (with server-side pull_bonus_task RPC + client fallback)
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
        } catch {
          // Fallback to client-side logic below
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

      if (supabaseConfig.enabled) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          await Promise.all([
            client.from('pool_tasks').delete().eq('id', chosenPoolTask.id),
            client.from('daily_tasks').insert(newDailyTask),
          ]);
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

      if (supabaseConfig.enabled) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          const taskToUpdate = dailyTasks.find((t) => t.id === id);
          if (taskToUpdate) {
            await client
              .from('daily_tasks')
              .update({ completed: !taskToUpdate.completed })
              .eq('id', id);
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
    ]
  );

  // Update Daily Task Title
  const updateDailyTaskTitle = useCallback(
    async (id: string, newTitle: string) => {
      if (!newTitle.trim()) return;
      setDailyTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, title: newTitle.trim() } : task))
      );

      if (supabaseConfig.enabled) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          await client.from('daily_tasks').update({ title: newTitle.trim() }).eq('id', id);
        }
      }
    },
    [supabaseConfig]
  );

  // Delete Daily Task
  const deleteDailyTask = useCallback(
    async (id: string) => {
      setDailyTasks((prev) => prev.filter((task) => task.id !== id));

      if (supabaseConfig.enabled) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          await client.from('daily_tasks').delete().eq('id', id);
        }
      }
    },
    [supabaseConfig]
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

      if (supabaseConfig.enabled) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          const updates = reordered.map((t) =>
            client.from('daily_tasks').update({ order_index: t.order_index }).eq('id', t.id)
          );
          await Promise.all(updates);
        }
      }
    },
    [dailyTasks, supabaseConfig]
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

      if (supabaseConfig.enabled) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          await client.from('pool_tasks').insert(newPoolTask);
        }
      }
    },
    [userId, authUser, supabaseConfig]
  );

  // Delete Pool Task
  const deletePoolTask = useCallback(
    async (id: string) => {
      setPoolTasks((prev) => prev.filter((p) => p.id !== id));

      if (supabaseConfig.enabled) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          await client.from('pool_tasks').delete().eq('id', id);
        }
      }
    },
    [supabaseConfig]
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
  }, []);

  return (
    <TaskContext.Provider
      value={{
        activeTab,
        setActiveTab,
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
        syncStatus,
        syncWithCloud,
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
