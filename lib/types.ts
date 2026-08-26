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
