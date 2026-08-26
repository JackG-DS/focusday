-- ====================================================================
-- SUPABASE SCHEMA, RLS POLICIES & HELPER FUNCTIONS
-- Project: FocusDay To-Do List Progressive Web App
-- Features: Daily Tasks, Bonus Pool, Recurring Tasks, User Settings & RPCs
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

-- 3. Create Recurring Tasks Table
create table if not exists public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  frequency text not null check (frequency in ('daily', 'weekly')),
  day_of_week integer check (day_of_week between 0 and 6), -- 0 = Sun, 1 = Mon ... 6 = Sat
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 4. Create User Settings Table
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  reset_time text not null default '04:00',
  last_reset_date date,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 5. Indexes for Fast Filtering & Ordering
create index if not exists idx_daily_tasks_user_date on public.daily_tasks(user_id, date_assigned, order_index);
create index if not exists idx_pool_tasks_user on public.pool_tasks(user_id);
create index if not exists idx_recurring_tasks_user on public.recurring_tasks(user_id);

-- 6. Enable Row Level Security (RLS)
alter table public.daily_tasks enable row level security;
alter table public.pool_tasks enable row level security;
alter table public.recurring_tasks enable row level security;
alter table public.user_settings enable row level security;

-- 7. RLS Policies for daily_tasks
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

-- 8. RLS Policies for pool_tasks
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

-- 9. RLS Policies for recurring_tasks
drop policy if exists "Users can view their own recurring tasks" on public.recurring_tasks;
create policy "Users can view their own recurring tasks"
  on public.recurring_tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own recurring tasks" on public.recurring_tasks;
create policy "Users can insert their own recurring tasks"
  on public.recurring_tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own recurring tasks" on public.recurring_tasks;
create policy "Users can update their own recurring tasks"
  on public.recurring_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own recurring tasks" on public.recurring_tasks;
create policy "Users can delete their own recurring tasks"
  on public.recurring_tasks for delete
  using (auth.uid() = user_id);

-- 10. RLS Policies for user_settings
drop policy if exists "Users can view their own settings" on public.user_settings;
create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own settings" on public.user_settings;
create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ====================================================================
-- 11. Helper Functions (RPC)
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
  select id, title into v_pool_id, v_title
  from public.pool_tasks
  where user_id = auth.uid()
  order by random()
  limit 1;

  if v_pool_id is null then
    return null;
  end if;

  select coalesce(max(order_index), 0) + 1 into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = current_date;

  insert into public.daily_tasks (user_id, title, completed, order_index, date_assigned)
  values (auth.uid(), v_title, false, v_max_order, current_date)
  returning * into v_new_task;

  delete from public.pool_tasks where id = v_pool_id;

  return v_new_task;
end;
$$;

-- Helper: Clear completed tasks for current user
create or replace function clear_completed_tasks()
returns void
language plpgsql
security invoker
as $$
begin
  delete from public.daily_tasks
  where user_id = auth.uid()
    and completed = true;
end;
$$;

-- Helper: Clear all daily tasks for today
create or replace function clear_all_daily_tasks()
returns void
language plpgsql
security invoker
as $$
begin
  delete from public.daily_tasks
  where user_id = auth.uid()
    and date_assigned = current_date;
end;
$$;

-- Helper: Automatically generate due recurring tasks for today
create or replace function generate_due_recurring_tasks()
returns setof public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_current_dow integer;
  v_max_order integer;
  rec record;
  v_new_task public.daily_tasks;
begin
  -- Extract day of week: 0 = Sunday, 1 = Monday ... 6 = Saturday
  v_current_dow := extract(dow from current_date)::integer;

  select coalesce(max(order_index), 0) into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = current_date;

  for rec in
    select r.id, r.title
    from public.recurring_tasks r
    where r.user_id = auth.uid()
      and (
        r.frequency = 'daily'
        or (r.frequency = 'weekly' and r.day_of_week = v_current_dow)
      )
      and not exists (
        select 1 from public.daily_tasks d
        where d.user_id = auth.uid()
          and d.date_assigned = current_date
          and d.title = r.title
      )
  loop
    v_max_order := v_max_order + 1;
    insert into public.daily_tasks (user_id, title, completed, order_index, date_assigned)
    values (auth.uid(), rec.title, false, v_max_order, current_date)
    returning * into v_new_task;

    return next v_new_task;
  end loop;

  return;
end;
$$;

-- Helper: Push a specific recurring template to today's daily tasks
create or replace function push_template_to_daily(p_title text)
returns public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_max_order integer;
  v_new_task public.daily_tasks;
begin
  select coalesce(max(order_index), 0) + 1 into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = current_date;

  insert into public.daily_tasks (user_id, title, completed, order_index, date_assigned)
  values (auth.uid(), p_title, false, v_max_order, current_date)
  returning * into v_new_task;

  return v_new_task;
end;
$$;

