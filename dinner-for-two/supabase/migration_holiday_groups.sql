-- ============================================
-- Миграция для групп праздников
-- Примените этот файл в Supabase SQL Editor
-- ============================================

-- 1. Таблица для групп праздников
create table if not exists holiday_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  holiday_type text, -- тип праздника (birthday, wedding, new_year, etc.)
  invite_code uuid default uuid_generate_v4() unique not null,
  created_by bigint references users(telegram_id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Таблица для участников групп праздников
create table if not exists holiday_members (
  id uuid primary key default uuid_generate_v4(),
  holiday_group_id uuid references holiday_groups(id) on delete cascade not null,
  telegram_id bigint references users(telegram_id) not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(holiday_group_id, telegram_id)
);

-- 3. Таблица для блюд в группах праздников
create table if not exists holiday_dishes (
  id uuid primary key default uuid_generate_v4(),
  holiday_group_id uuid references holiday_groups(id) on delete cascade not null,
  name text not null,
  category text check (category in ('cold_appetizers', 'hot_dishes', 'salads', 'alcohol', 'desserts', 'drinks', 'other')) not null,
  created_by bigint references users(telegram_id) not null,
  recipe text,
  calories integer,
  proteins integer,
  fats integer,
  carbs integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Таблица для апрувов блюд (каждый участник должен апрувнуть)
create table if not exists holiday_dish_approvals (
  id uuid primary key default uuid_generate_v4(),
  holiday_dish_id uuid references holiday_dishes(id) on delete cascade not null,
  telegram_id bigint references users(telegram_id) not null,
  approved_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(holiday_dish_id, telegram_id)
);

-- 5. Таблица для ингредиентов блюд праздников
create table if not exists holiday_dish_ingredients (
  id uuid primary key default uuid_generate_v4(),
  holiday_dish_id uuid references holiday_dishes(id) on delete cascade not null,
  name text not null,
  amount text,
  unit text,
  is_purchased boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Индексы для производительности
create index if not exists idx_holiday_groups_invite_code on holiday_groups(invite_code);
create index if not exists idx_holiday_groups_created_by on holiday_groups(created_by);
create index if not exists idx_holiday_members_group on holiday_members(holiday_group_id);
create index if not exists idx_holiday_members_user on holiday_members(telegram_id);
create index if not exists idx_holiday_dishes_group on holiday_dishes(holiday_group_id);
create index if not exists idx_holiday_dishes_category on holiday_dishes(category);
create index if not exists idx_holiday_dish_approvals_dish on holiday_dish_approvals(holiday_dish_id);
create index if not exists idx_holiday_dish_approvals_user on holiday_dish_approvals(telegram_id);
create index if not exists idx_holiday_dish_ingredients_dish on holiday_dish_ingredients(holiday_dish_id);

-- Триггеры для обновления updated_at
drop trigger if exists update_holiday_groups_updated_at on holiday_groups;
create trigger update_holiday_groups_updated_at before update on holiday_groups
    for each row execute function update_updated_at_column();

drop trigger if exists update_holiday_dishes_updated_at on holiday_dishes;
create trigger update_holiday_dishes_updated_at before update on holiday_dishes
    for each row execute function update_updated_at_column();

-- Включить RLS
alter table holiday_groups enable row level security;
alter table holiday_members enable row level security;
alter table holiday_dishes enable row level security;
alter table holiday_dish_approvals enable row level security;
alter table holiday_dish_ingredients enable row level security;

-- Политики RLS для holiday_groups
-- Упрощенные политики - фильтрация по couple_id/telegram_id будет в коде
create policy "Users can view holiday groups" on holiday_groups for select using (true);
create policy "Users can create holiday groups" on holiday_groups for insert with check (true);
create policy "Users can update holiday groups" on holiday_groups for update using (true);

-- Политики RLS для holiday_members
create policy "Users can view members of their holiday groups" on holiday_members for select using (true);
create policy "Users can join holiday groups" on holiday_members for insert with check (true);
create policy "Users can leave holiday groups" on holiday_members for delete using (true);

-- Политики RLS для holiday_dishes
create policy "Users can view dishes in their holiday groups" on holiday_dishes for select using (true);
create policy "Users can add dishes to their holiday groups" on holiday_dishes for insert with check (true);
create policy "Users can update dishes in their holiday groups" on holiday_dishes for update using (true);
create policy "Users can delete dishes in their holiday groups" on holiday_dishes for delete using (true);

-- Политики RLS для holiday_dish_approvals
create policy "Users can view approvals in their holiday groups" on holiday_dish_approvals for select using (true);
create policy "Users can approve dishes in their holiday groups" on holiday_dish_approvals for insert with check (true);
create policy "Users can remove their approvals" on holiday_dish_approvals for delete using (true);

-- Политики RLS для holiday_dish_ingredients
create policy "Users can manage ingredients in their holiday groups" on holiday_dish_ingredients for all using (true);

-- ============================================

