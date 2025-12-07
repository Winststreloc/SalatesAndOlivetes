-- Create table for saving weekly meal plans
create table if not exists weekly_plans (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references couples(id) on delete cascade not null,
  week_start_date date not null, -- Monday of the week
  dishes jsonb not null, -- Array of dish data with ingredients
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(couple_id, week_start_date)
);

-- Create index for fast lookups
create index if not exists idx_weekly_plans_couple_date on weekly_plans(couple_id, week_start_date desc);

