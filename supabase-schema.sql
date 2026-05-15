create table if not exists public.monthly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  activities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

alter table public.monthly_plans enable row level security;

drop policy if exists "Users can read their own monthly plans" on public.monthly_plans;
create policy "Users can read their own monthly plans"
on public.monthly_plans
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own monthly plans" on public.monthly_plans;
create policy "Users can create their own monthly plans"
on public.monthly_plans
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own monthly plans" on public.monthly_plans;
create policy "Users can update their own monthly plans"
on public.monthly_plans
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own monthly plans" on public.monthly_plans;
create policy "Users can delete their own monthly plans"
on public.monthly_plans
for delete
to authenticated
using (auth.uid() = user_id);
