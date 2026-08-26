-- ====================================================================
-- SUPABASE SCHEMA, RLS POLICIES & HELPER FUNCTIONS
-- Project: FocusDay To-Do List Progressive Web App
-- Features: Daily Tasks, Bonus Pool, Strict User RLS, Realtime & RPCs
-- ====================================================================

-- 1. Create Daily Tasks Table
create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  completed boolean not null default false,
  order_index integer not null default 0,
  date_assigned date not null default current_date,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. Create Bonus Pool Tasks Table
create table if not exists public.pool_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 3. Indexes for Fast Filtering & Ordering
create index if not exists idx_daily_tasks_user_date on public.daily_tasks(user_id, date_assigned, order_index);
create index if not exists idx_pool_tasks_user on public.pool_tasks(user_id);

-- 4. Enable Row Level Security (RLS)
alter table public.daily_tasks enable row level security;
alter table public.pool_tasks enable row level security;

-- 5. RLS Policies for daily_tasks
drop policy if exists "Users can view their own daily tasks" on public.daily_tasks;
create policy "Users can view their own daily tasks"
  on public.daily_tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own daily tasks" on public.daily_tasks;
create policy "Users can insert their own daily tasks"
  on public.daily_tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own daily tasks" on public.daily_tasks;
create policy "Users can update their own daily tasks"
  on public.daily_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own daily tasks" on public.daily_tasks;
create policy "Users can delete their own daily tasks"
  on public.daily_tasks for delete
  using (auth.uid() = user_id);

-- 6. RLS Policies for pool_tasks
drop policy if exists "Users can view their own pool tasks" on public.pool_tasks;
create policy "Users can view their own pool tasks"
  on public.pool_tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own pool tasks" on public.pool_tasks;
create policy "Users can insert their own pool tasks"
  on public.pool_tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own pool tasks" on public.pool_tasks;
create policy "Users can update their own pool tasks"
  on public.pool_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own pool tasks" on public.pool_tasks;
create policy "Users can delete their own pool tasks"
  on public.pool_tasks for delete
  using (auth.uid() = user_id);

-- 7. Enable Realtime Publications
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'daily_tasks'
  ) then
    alter publication supabase_realtime add table public.daily_tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'pool_tasks'
  ) then
    alter publication supabase_realtime add table public.pool_tasks;
  end if;
end $$;

-- ====================================================================
-- 8. Helper Functions (RPC)
-- ====================================================================

-- Helper: Rollover incomplete tasks from previous days to today
create or replace function rollover_incomplete_tasks()
returns setof public.daily_tasks
language plpgsql
security invoker
as $$
begin
  return query
  update public.daily_tasks
  set date_assigned = current_date
  where user_id = auth.uid()
    and completed = false
    and date_assigned < current_date
  returning *;
end;
$$;

-- Helper: Pull one random pool task and move it into today's daily list
create or replace function pull_bonus_task()
returns public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_pool_id uuid;
  v_title text;
  v_new_task public.daily_tasks;
  v_max_order integer;
begin
  -- 1. Grab a random task from the pool
  select id, title into v_pool_id, v_title
  from public.pool_tasks
  where user_id = auth.uid()
  order by random()
  limit 1;

  if v_pool_id is null then
    return null;
  end if;

  -- 2. Find the current max order_index for today
  select coalesce(max(order_index), 0) + 1 into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = current_date;

  -- 3. Insert into daily_tasks for today
  insert into public.daily_tasks (user_id, title, completed, order_index, date_assigned)
  values (auth.uid(), v_title, false, v_max_order, current_date)
  returning * into v_new_task;

  -- 4. Delete the claimed item from the pool
  delete from public.pool_tasks where id = v_pool_id;

  return v_new_task;
end;
$$;
