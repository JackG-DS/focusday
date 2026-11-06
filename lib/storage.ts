import {
  DailyTask,
  PoolTask,
  RecurringTask,
  UserSettings,
  SupabaseConfig,
  BountyTaskMeta,
  BountyLedgerEntry,
} from './types';

const STORAGE_KEYS = {
  DAILY_TASKS: 'antigravity_daily_tasks_v1',
  POOL_TASKS: 'antigravity_pool_tasks_v1',
  RECURRING_TASKS: 'antigravity_recurring_tasks_v1',
  SETTINGS: 'antigravity_settings_v1',
  SUPABASE_CONFIG: 'antigravity_supabase_config_v1',
  SYNC_QUEUE: 'antigravity_sync_queue_v1',
  USER_ID: 'antigravity_user_id_v1',
  BOUNTY_META: 'antigravity_bounty_meta_v1',
  BOUNTY_LEDGER: 'antigravity_bounty_ledger_v1',
};

import {
  getLocalDateString,
  getTomorrowDateString,
  getLogicalDayStartIso,
  getWeekStartDateString,
  getWeekEndDateString,
  formatWeekRangeLabel,
} from './dateUtils';
export {
  getLocalDateString,
  getTomorrowDateString,
  getLogicalDayStartIso,
  getWeekStartDateString,
  getWeekEndDateString,
  formatWeekRangeLabel,
};
export const getTodayDateString = getLocalDateString;

export function isTaskBonusBounty(task: DailyTask, poolTitlesSet?: Set<string>): boolean {
  if (task.is_bonus === true) return true;
  if (task.is_bonus === false) return false;
  const trimmed = task.title.trim();
  if (trimmed.startsWith('💰') || trimmed.startsWith('🎁')) return true;
  if (poolTitlesSet && poolTitlesSet.has(trimmed.toLowerCase())) return true;
  return false;
}

export function calculateTaskBountyValue(
  task: DailyTask,
  todayStr: string,
  nowMs: number = Date.now(),
  poolTitlesSet?: Set<string>
): number {
  if (isTaskBonusBounty(task, poolTitlesSet)) {
    return 10;
  }

  if (task.completed && typeof task.bounty_earned === 'number') {
    return task.bounty_earned;
  }

  // Tasks in Tomorrow's Leads stay at $100 until they move to Today's Most Wanted
  if (task.date_assigned > todayStr) {
    return 100;
  }

  const startIso = task.bounty_started_at || task.created_at;
  const startMs = startIso ? new Date(startIso).getTime() : nowMs;
  if (Number.isNaN(startMs) || nowMs <= startMs) {
    return 100;
  }

  const hoursElapsed = Math.floor((nowMs - startMs) / (1000 * 60 * 60));
  return Math.max(20, 100 - hoursElapsed);
}

export function getMinutesUntilNextDecay(
  task: DailyTask,
  todayStr: string,
  nowMs: number = Date.now(),
  poolTitlesSet?: Set<string>
): number | null {
  if (task.completed || isTaskBonusBounty(task, poolTitlesSet) || task.date_assigned > todayStr) {
    return null;
  }
  const currentVal = calculateTaskBountyValue(task, todayStr, nowMs, poolTitlesSet);
  if (currentVal <= 20) return null;

  const startIso = task.bounty_started_at || task.created_at;
  const startMs = startIso ? new Date(startIso).getTime() : nowMs;
  if (Number.isNaN(startMs) || nowMs < startMs) return 60;

  const elapsedMs = nowMs - startMs;
  const msInCurrentHour = elapsedMs % (1000 * 60 * 60);
  const msRemaining = 1000 * 60 * 60 - msInCurrentHour;
  return Math.max(1, Math.ceil(msRemaining / (1000 * 60)));
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
    title: 'Track down today’s #1 Most Wanted target 🎯',
    completed: false,
    order_index: 0,
    date_assigned: today,
    created_at: new Date().toISOString(),
  },
  {
    id: generateUUID(),
    user_id: userId,
    title: 'Complete 30-minute deep focus showdown ⚡',
    completed: false,
    order_index: 1,
    date_assigned: today,
    created_at: new Date().toISOString(),
  },
  {
    id: generateUUID(),
    user_id: userId,
    title: 'Water the horses & 10 min afternoon stretch 💧',
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
    title: '💰 Bounty: Read 15 pages of a frontier classic',
    created_at: new Date().toISOString(),
  },
  {
    id: generateUUID(),
    user_id: userId,
    title: '💰 Bounty: Tidy up the Sheriff’s desk & workspace',
    created_at: new Date().toISOString(),
  },
  {
    id: generateUUID(),
    user_id: userId,
    title: '💰 Bounty: Listen to an insightful podcast episode',
    created_at: new Date().toISOString(),
  },
  {
    id: generateUUID(),
    user_id: userId,
    title: '💰 Bounty: Cook up a hearty camp-style dinner',
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
  day_ended_date: null,
};

export const StorageService = {
  getDailyTasks(userId: string): DailyTask[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_TASKS);
    if (!raw) {
      // Only seed initial mock tasks for unauthenticated / anonymous local-user
      if (!userId || userId === 'local-user') {
        const today = getTodayDateString();
        const initial = INITIAL_DAILY_TASKS(userId || 'local-user', today);
        this.saveDailyTasks(initial);
        return initial;
      }
      return [];
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
      if (!userId || userId === 'local-user') {
        const initial = INITIAL_POOL_TASKS(userId || 'local-user');
        this.savePoolTasks(initial);
        return initial;
      }
      return [];
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
      if (!userId || userId === 'local-user') {
        const initial = INITIAL_RECURRING_TASKS(userId || 'local-user');
        this.saveRecurringTasks(initial);
        return initial;
      }
      return [];
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

  getBountyMetaMap(): Record<string, BountyTaskMeta> {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(STORAGE_KEYS.BOUNTY_META);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  saveBountyMetaMap(metaMap: Record<string, BountyTaskMeta>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.BOUNTY_META, JSON.stringify(metaMap));
  },

  getBountyLedger(): BountyLedgerEntry[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEYS.BOUNTY_LEDGER);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveBountyLedger(ledger: BountyLedgerEntry[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.BOUNTY_LEDGER, JSON.stringify(ledger));
  },

  clearAllData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.DAILY_TASKS);
    localStorage.removeItem(STORAGE_KEYS.POOL_TASKS);
    localStorage.removeItem(STORAGE_KEYS.RECURRING_TASKS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.BOUNTY_META);
    localStorage.removeItem(STORAGE_KEYS.BOUNTY_LEDGER);
  },
};
