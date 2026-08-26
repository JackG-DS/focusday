import { DailyTask, PoolTask, RecurringTask, UserSettings, SupabaseConfig } from './types';

const STORAGE_KEYS = {
  DAILY_TASKS: 'antigravity_daily_tasks_v1',
  POOL_TASKS: 'antigravity_pool_tasks_v1',
  RECURRING_TASKS: 'antigravity_recurring_tasks_v1',
  SETTINGS: 'antigravity_settings_v1',
  SUPABASE_CONFIG: 'antigravity_supabase_config_v1',
  SYNC_QUEUE: 'antigravity_sync_queue_v1',
  USER_ID: 'antigravity_user_id_v1',
};

// Generates local ISO Date in YYYY-MM-DD format based on user's timezone
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatReadableDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// Generate client UUID v4
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get or create anonymous local user ID
export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'local-user';
  let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  }
  return userId;
}

// Default Seed Data to give the user an immediate rewarding experience
export const INITIAL_DAILY_TASKS = (userId: string, today: string): DailyTask[] => [
  {
    id: generateUUID(),
    user_id: userId,
    title: 'Review today’s high-priority launch targets 🎯',
    completed: false,
    order_index: 0,
    date_assigned: today,
    created_at: new Date().toISOString(),
  },
  {
    id: generateUUID(),
    user_id: userId,
    title: 'Complete 30-minute deep focus block ⚡',
    completed: false,
    order_index: 1,
    date_assigned: today,
    created_at: new Date().toISOString(),
  },
  {
    id: generateUUID(),
    user_id: userId,
    title: 'Hydrate & 10 min quick afternoon stretch 💧',
    completed: false,
    order_index: 2,
    date_assigned: today,
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_POOL_TASKS = (userId: string): PoolTask[] => [
  {
    id: generateUUID(),
    user_id: userId,
    title: '🎁 Bonus: Read 15 pages of an inspiring book',
    created_at: new Date().toISOString(),
  },
  {
    id: generateUUID(),
    user_id: userId,
    title: '🎁 Bonus: Tidy and organize desktop workspace',
    created_at: new Date().toISOString(),
  },
  {
    id: generateUUID(),
    user_id: userId,
    title: '🎁 Bonus: Listen to an insightful podcast episode',
    created_at: new Date().toISOString(),
  },
  {
    id: generateUUID(),
    user_id: userId,
    title: '🎁 Bonus: Plan a healthy home-cooked dinner recipe',
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_RECURRING_TASKS = (userId: string): RecurringTask[] => [
  {
    id: generateUUID(),
    user_id: userId,
    title: 'Morning 10-minute inbox & schedule review',
    frequency: 'daily',
    created_at: new Date().toISOString(),
  },
  {
    id: generateUUID(),
    user_id: userId,
    title: 'Weekly planning & sprint retrospective',
    frequency: 'weekly',
    day_of_week: 1, // Monday
    created_at: new Date().toISOString(),
  },
];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  confettiEnabled: true,
  soundEnabled: true,
  lastActiveDate: getTodayDateString(),
  streakCount: 1,
  bonusTriggeredDates: [],
  reset_time: '04:00',
  last_reset_date: '',
};

export const StorageService = {
  getDailyTasks(userId: string): DailyTask[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_TASKS);
    if (!raw) {
      const today = getTodayDateString();
      const initial = INITIAL_DAILY_TASKS(userId, today);
      this.saveDailyTasks(initial);
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveDailyTasks(tasks: DailyTask[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.DAILY_TASKS, JSON.stringify(tasks));
  },

  getPoolTasks(userId: string): PoolTask[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEYS.POOL_TASKS);
    if (!raw) {
      const initial = INITIAL_POOL_TASKS(userId);
      this.savePoolTasks(initial);
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  savePoolTasks(tasks: PoolTask[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.POOL_TASKS, JSON.stringify(tasks));
  },

  getRecurringTasks(userId: string): RecurringTask[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEYS.RECURRING_TASKS);
    if (!raw) {
      const initial = INITIAL_RECURRING_TASKS(userId);
      this.saveRecurringTasks(initial);
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveRecurringTasks(tasks: RecurringTask[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.RECURRING_TASKS, JSON.stringify(tasks));
  },

  getSettings(): UserSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: UserSettings): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getSupabaseConfig(): SupabaseConfig {
    if (typeof window === 'undefined') {
      return { url: '', anonKey: '', enabled: false };
    }
    const raw = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
    if (!raw) {
      const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      return {
        url: envUrl,
        anonKey: envKey,
        enabled: Boolean(envUrl && envKey),
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { url: '', anonKey: '', enabled: false };
    }
  },

  saveSupabaseConfig(config: SupabaseConfig): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
  },

  clearAllData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.DAILY_TASKS);
    localStorage.removeItem(STORAGE_KEYS.POOL_TASKS);
    localStorage.removeItem(STORAGE_KEYS.RECURRING_TASKS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
  },
};
