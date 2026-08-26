import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { SupabaseConfig, DailyTask } from './types';

let cachedClient: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const url = config?.url || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = config?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const configKey = `${url}:${anonKey}`;
  if (cachedClient && currentConfigKey === configKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentConfigKey = configKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// Simple Email / Password Sign Up
export async function signUpWithEmail(
  email: string,
  password: string,
  config?: SupabaseConfig
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { user: null, session: null, error: new Error('Supabase client is not configured') };
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  return {
    user: data.user,
    session: data.session,
    error: error ? new Error(error.message) : null,
  };
}

// Simple Email / Password Sign In
export async function signInWithEmail(
  email: string,
  password: string,
  config?: SupabaseConfig
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { user: null, session: null, error: new Error('Supabase client is not configured') };
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data.user,
    session: data.session,
    error: error ? new Error(error.message) : null,
  };
}

// Sign Out
export async function signOutUser(config?: SupabaseConfig): Promise<{ error: Error | null }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { error: null };
  }

  const { error } = await client.auth.signOut();
  return { error: error ? new Error(error.message) : null };
}

// Get Current User
export async function getCurrentAuthUser(config?: SupabaseConfig): Promise<User | null> {
  const client = getSupabaseClient(config);
  if (!client) return null;

  try {
    const { data } = await client.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

// RPC Helper: Rollover overdue tasks on app load
export async function rolloverIncompleteTasksRPC(
  config?: SupabaseConfig
): Promise<{ data: DailyTask[] | null; error: Error | null }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  const { data, error } = await client.rpc('rollover_incomplete_tasks');
  return {
    data: (data as DailyTask[]) || null,
    error: error ? new Error(error.message) : null,
  };
}

// RPC Helper: Pull a bonus task when all items are checked
export async function pullBonusTaskRPC(
  config?: SupabaseConfig
): Promise<{ data: DailyTask | null; error: Error | null }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  const { data, error } = await client.rpc('pull_bonus_task');
  return {
    data: (data as DailyTask) || null,
    error: error ? new Error(error.message) : null,
  };
}
