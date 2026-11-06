-- ====================================================================
-- SUPABASE SCHEMA, RLS POLICIES & HELPER FUNCTIONS
-- Project: FocusDay To-Do List Progressive Web App
-- Features: Daily Tasks, Bonus Pool, Recurring Tasks, Colors, End Day & RPCs
-- ====================================================================

-- 1. Create Daily Tasks Table
create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  notes text,
  color text,
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
  notes text,
  color text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 3. Create Recurring Tasks Table
create table if not exists public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  notes text,
  color text,
  frequency text not null check (frequency in ('daily', 'weekly')),
  day_of_week integer check (day_of_week between 0 and 6), -- 0 = Sun, 1 = Mon ... 6 = Sat
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 4. Create User Settings Table
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  reset_time text not null default '04:00',
  last_reset_date date,
  day_ended_date date,
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

-- Helper: Rollover incomplete tasks from previous days to today (uses client's local/logical p_today)
create or replace function rollover_incomplete_tasks(p_today date default current_date)
returns setof public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_today date := coalesce(p_today, current_date);
begin
  return query
  update public.daily_tasks
  set date_assigned = v_today
  where user_id = auth.uid()
    and completed = false
    and date_assigned < v_today
  returning *;
end;
$$;

-- Helper: Pull one random pool task and copy it into today's daily list (preserving notes & color, preserving pool item)
create or replace function pull_bonus_task(p_today date default current_date)
returns public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_pool_id uuid;
  v_title text;
  v_notes text;
  v_color text;
  v_target_date date;
  v_new_task public.daily_tasks;
  v_max_order integer;
begin
  v_target_date := coalesce(p_today, current_date);

  select id, title, notes, color into v_pool_id, v_title, v_notes, v_color
  from public.pool_tasks
  where user_id = auth.uid()
  order by random()
  limit 1;

  if v_pool_id is null then
    return null;
  end if;

  select coalesce(max(order_index), 0) + 1 into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = v_target_date;

  insert into public.daily_tasks (user_id, title, notes, color, completed, order_index, date_assigned)
  values (auth.uid(), v_title, v_notes, v_color, false, v_max_order, v_target_date)
  returning * into v_new_task;

  -- The Bonus Pool acts as an indefinite library/reservoir: do NOT delete from pool_tasks.

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

-- Helper: Clear all daily tasks for today (uses client's local/logical p_today)
create or replace function clear_all_daily_tasks(p_today date default current_date)
returns void
language plpgsql
security invoker
as $$
declare
  v_today date := coalesce(p_today, current_date);
begin
  delete from public.daily_tasks
  where user_id = auth.uid()
    and date_assigned = v_today;
end;
$$;

-- Helper: Automatically generate due recurring tasks for today (preserving notes & color, deduplicated)
create or replace function generate_due_recurring_tasks(p_today date default current_date)
returns setof public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_current_dow integer;
  v_max_order integer;
  rec record;
  v_new_task public.daily_tasks;
  v_target_date date;
begin
  v_target_date := coalesce(p_today, current_date);
  v_current_dow := extract(dow from v_target_date)::integer;

  select coalesce(max(order_index), 0) into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = v_target_date;

  for rec in
    select r.id, r.title, r.notes, r.color
    from public.recurring_tasks r
    where r.user_id = auth.uid()
      and (
        r.frequency = 'daily'
        or (r.frequency = 'weekly' and r.day_of_week = v_current_dow)
      )
      and not exists (
        select 1 from public.daily_tasks d
        where d.user_id = auth.uid()
          and d.date_assigned = v_target_date
          and lower(trim(d.title)) = lower(trim(r.title))
          and d.completed = false
      )
  loop
    v_max_order := v_max_order + 1;
    insert into public.daily_tasks (user_id, title, notes, color, completed, order_index, date_assigned)
    values (auth.uid(), rec.title, rec.notes, rec.color, false, v_max_order, v_target_date)
    returning * into v_new_task;

    return next v_new_task;
  end loop;

  return;
end;
$$;

-- Helper: Push template to today's daily tasks (preserving notes & color, prevents duplicate active tasks)
create or replace function push_template_to_daily(p_title text, p_notes text default null, p_color text default null, p_target_date date default current_date)
returns public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_target_date date;
  v_max_order integer;
  v_new_task public.daily_tasks;
  v_existing_id uuid;
begin
  v_target_date := coalesce(p_target_date, current_date);

  -- Deduplication check: do not insert if an active/incomplete task with matching title already exists on target date
  select id into v_existing_id
  from public.daily_tasks
  where user_id = auth.uid()
    and date_assigned = v_target_date
    and lower(trim(title)) = lower(trim(p_title))
    and completed = false
  limit 1;

  if v_existing_id is not null then
    return null;
  end if;

  select coalesce(max(order_index), 0) + 1 into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = v_target_date;

  insert into public.daily_tasks (user_id, title, notes, color, completed, order_index, date_assigned)
  values (auth.uid(), p_title, p_notes, p_color, false, v_max_order, v_target_date)
  returning * into v_new_task;

  return v_new_task;
end;
$$;

-- Helper: Add task for tomorrow
create or replace function add_task_for_tomorrow(p_title text, p_notes text default null, p_color text default null)
returns public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_tomorrow date;
  v_max_order integer;
  v_new_task public.daily_tasks;
  v_existing_id uuid;
begin
  v_tomorrow := current_date + 1;

  -- Deduplication check for tomorrow
  select id into v_existing_id
  from public.daily_tasks
  where user_id = auth.uid()
    and date_assigned = v_tomorrow
    and lower(trim(title)) = lower(trim(p_title))
    and completed = false
  limit 1;

  if v_existing_id is not null then
    return null;
  end if;

  select coalesce(max(order_index), 0) + 1 into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = v_tomorrow;

  insert into public.daily_tasks (user_id, title, notes, color, completed, order_index, date_assigned)
  values (auth.uid(), p_title, p_notes, p_color, false, v_max_order, v_tomorrow)
  returning * into v_new_task;

  return v_new_task;
end;
$$;

-- Helper: Move task to specific date (defaults to today)
create or replace function move_task_to_date(p_task_id uuid, p_new_date date default current_date)
returns public.daily_tasks
language plpgsql
security invoker
as $$
declare
  v_target_date date;
  v_max_order integer;
  v_updated_task public.daily_tasks;
begin
  v_target_date := coalesce(p_new_date, current_date);

  select coalesce(max(order_index), 0) + 1 into v_max_order
  from public.daily_tasks
  where user_id = auth.uid() and date_assigned = v_target_date;

  update public.daily_tasks
  set date_assigned = v_target_date,
      order_index = v_max_order
  where id = p_task_id and user_id = auth.uid()
  returning * into v_updated_task;

  return v_updated_task;
end;
$$;

-- Helper: Move task from tomorrow to today
create or replace function move_task_to_today(p_task_id uuid)
returns public.daily_tasks
language plpgsql
security invoker
as $$
begin
  return move_task_to_date(p_task_id, current_date);
end;
$$;
