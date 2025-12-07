-- ============================================
-- Объединенная миграция для всех новых функций
-- Примените этот файл в Supabase SQL Editor
-- ============================================

-- 1. Таблица для кэширования AI результатов
create table if not exists dish_cache (
  id uuid primary key default uuid_generate_v4(),
  dish_name text not null,
  dish_name_lower text not null, -- for case-insensitive lookup
  ingredients jsonb not null,
  recipe text,
  lang text check (lang in ('en', 'ru')) default 'ru',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  usage_count integer default 0,
  unique(dish_name_lower, lang)
);

-- Индекс для быстрого поиска
create index if not exists idx_dish_cache_name_lang on dish_cache(dish_name_lower, lang);

-- Триггер для обновления updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_dish_cache_updated_at on dish_cache;
create trigger update_dish_cache_updated_at before update on dish_cache
    for each row execute function update_updated_at_column();

-- 2. Таблица для истории недель
create table if not exists weekly_plans (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references couples(id) on delete cascade not null,
  week_start_date date not null, -- Monday of the week
  dishes jsonb not null, -- Array of dish data with ingredients
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(couple_id, week_start_date)
);

-- Индекс для быстрого поиска
create index if not exists idx_weekly_plans_couple_date on weekly_plans(couple_id, week_start_date desc);

-- 3. Таблица для ручных ингредиентов (добавленных пользователем)
create table if not exists manual_ingredients (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references couples(id) on delete cascade not null,
  name text not null,
  amount text,
  unit text,
  is_purchased boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Индекс для быстрого поиска
create index if not exists idx_manual_ingredients_couple on manual_ingredients(couple_id);

-- Триггер для обновления updated_at
create trigger update_manual_ingredients_updated_at before update on manual_ingredients
    for each row execute function update_updated_at_column();

-- Включить RLS для новых таблиц
alter table dish_cache enable row level security;
alter table weekly_plans enable row level security;
alter table manual_ingredients enable row level security;

-- Политики RLS для dish_cache (публичный доступ для чтения, так как это кэш)
create policy "Anyone can read dish cache" on dish_cache for select using (true);
create policy "Service role can manage dish cache" on dish_cache for all using (true);

-- Политики RLS для weekly_plans (только для пользователей пары)
-- Примечание: Это базовая политика, может потребоваться доработка в зависимости от вашей системы аутентификации
create policy "Users can view their couple's weekly plans" on weekly_plans for select 
  using (true); -- Временно разрешаем всем, так как фильтрация идет по couple_id в коде

create policy "Users can insert their couple's weekly plans" on weekly_plans for insert 
  with check (true); -- Временно разрешаем всем

create policy "Users can update their couple's weekly plans" on weekly_plans for update 
  using (true); -- Временно разрешаем всем

create policy "Users can delete their couple's weekly plans" on weekly_plans for delete 
  using (true); -- Временно разрешаем всем

-- Политики RLS для manual_ingredients
create policy "Users can manage their couple's manual ingredients" on manual_ingredients for all using (true);

