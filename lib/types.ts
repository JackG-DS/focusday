export type TaskColor = 'default' | 'red' | 'orange' | 'amber' | 'emerald' | 'blue' | 'purple';

export interface DailyTask {
  id: string;
  user_id: string;
  title: string;
  notes?: string | null;
  color?: string | null;
  completed: boolean;
  order_index: number;
  date_assigned: string; // YYYY-MM-DD
  created_at: string;
  is_bonus?: boolean; // true if pulled from Bounties ($10 fixed), false/undefined if Most Wanted ($100 -> -$1/hr -> min $20)
  bounty_started_at?: string; // ISO timestamp when hourly decay started on Most Wanted
  bounty_earned?: number | null; // Locked-in $ value when completed
  completed_at?: string | null; // ISO timestamp when completed
  bounty_amount?: number | null; // Custom starting bounty value (defaults to $100)
}

export interface BountyTaskMeta {
  is_bonus?: boolean;
  bounty_started_at?: string;
  bounty_earned?: number | null;
  completed_at?: string | null;
  bounty_amount?: number | null;
}

export interface BountyLedgerEntry {
  taskId: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD logical date when completed
  weekStart: string; // Monday YYYY-MM-DD of that week
  completedAt: string; // ISO timestamp
  isBonus?: boolean;
}

export interface WeeklyBountySummary {
  weekStart: string; // Monday YYYY-MM-DD
  weekEnd: string; // Sunday YYYY-MM-DD
  label: string; // e.g. "Nov 2–8"
  totalAmount: number;
  tasksCount: number;
  isCurrentWeek: boolean;
}

export interface PoolTask {
  id: string;
  user_id: string;
  title: string;
  notes?: string | null;
  color?: string | null;
  created_at: string;
}

export interface RecurringTask {
  id: string;
  user_id: string;
  title: string;
  notes?: string | null;
  color?: string | null;
  frequency: 'daily' | 'weekly';
  day_of_week?: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (for weekly)
  created_at: string;
}

export type SyncStatus = 'offline' | 'idle' | 'syncing' | 'synced' | 'error';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

export interface AuthUserState {
  id: string;
  email: string | null;
  isAuthenticated: boolean;
}

export interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  confettiEnabled: boolean;
  soundEnabled: boolean;
  lastActiveDate: string; // YYYY-MM-DD
  streakCount: number;
  lastCompletedDate?: string;
  bonusTriggeredDates?: string[];
  reset_time: string; // HH:MM, default "04:00"
  last_reset_date?: string; // YYYY-MM-DD
  day_ended_date?: string | null; // YYYY-MM-DD when user clicks "End Day"
}

export type ActiveTab = 'today' | 'pool' | 'recurring' | 'history' | 'settings';

export interface RolloverReport {
  date: string;
  migratedCount: number;
}

export interface TaskActionResult {
  success: boolean;
  duplicate?: boolean;
  message?: string;
  task?: DailyTask | null;
}
