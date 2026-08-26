export interface DailyTask {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  order_index: number;
  date_assigned: string; // YYYY-MM-DD
  created_at: string;
}

export interface PoolTask {
  id: string;
  user_id: string;
  title: string;
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
}

export type ActiveTab = 'today' | 'pool' | 'history' | 'settings';

export interface RolloverReport {
  date: string;
  migratedCount: number;
}
