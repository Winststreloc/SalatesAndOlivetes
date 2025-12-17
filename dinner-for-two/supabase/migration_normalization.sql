-- ============================================
-- Нормализация хранения планов и кеша блюд
-- Создает таблицы для нормализованных связей и мигрирует данные из JSON
-- ============================================

-- 0. Хелпер для updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- 1. Нормализованные таблицы для weekly_plans
create table if not exists weekly_plan_dishes (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid references weekly_plans(id) on delete cascade not null,
  dish_id uuid references dishes(id),
  name text not null,
  status text check (status in ('proposed', 'selected', 'purchased')) default 'proposed',
  dish_date date,
  recipe text,
  calories integer,
  proteins integer,
  fats integer,
  carbs integer,
  created_by bigint references users(telegram_id),
  position integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists weekly_plan_ingredients (
  id uuid primary key default uuid_generate_v4(),
  plan_dish_id uuid references weekly_plan_dishes(id) on delete cascade not null,
  ingredient_id uuid references ingredients(id),
  name text not null,
  amount text,
  unit text,
  is_purchased boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_weekly_plan_dishes_plan on weekly_plan_dishes(plan_id);
create index if not exists idx_weekly_plan_dishes_plan_date on weekly_plan_dishes(plan_id, dish_date);
create index if not exists idx_weekly_plan_ingredients_plan_dish on weekly_plan_ingredients(plan_dish_id);

-- 2. Нормализованная таблица для ингредиентов кеша
create table if not exists dish_cache_ingredients (
  id uuid primary key default uuid_generate_v4(),
  cache_id uuid references dish_cache(id) on delete cascade not null,
  name text not null,
  amount text,
  unit text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_dish_cache_ingredients_cache on dish_cache_ingredients(cache_id);

-- 3. Миграция данных из weekly_plans.dishes (jsonb) в новые таблицы
do $$
declare
  plan_row record;
  dish_row record;
  ing_row record;
  new_plan_dish_id uuid;
  normalized_status text;
  dish_uuid uuid;
  ing_uuid uuid;
begin
  if exists(select 1 from information_schema.columns where table_name = 'weekly_plans' and column_name = 'dishes') then
    -- избегаем повторной миграции
    if not exists(select 1 from weekly_plan_dishes) then
      for plan_row in select id, dishes from weekly_plans where dishes is not null loop
        for dish_row in
          select d.elem, d.ordinality
          from jsonb_array_elements(plan_row.dishes) with ordinality as d(elem, ordinality)
        loop
          normalized_status := case
            when dish_row.elem ->> 'status' in ('proposed','selected','purchased') then dish_row.elem ->> 'status'
            else 'proposed'
          end;

          dish_uuid := nullif(dish_row.elem ->> 'id', '')::uuid;
          if dish_uuid is not null then
            select id into dish_uuid from dishes where id = dish_uuid;
          end if;

          insert into weekly_plan_dishes (
            plan_id,
            dish_id,
            name,
            status,
            dish_date,
            recipe,
            calories,
            proteins,
            fats,
            carbs,
            created_by,
            position
          ) values (
            plan_row.id,
            dish_uuid,
            coalesce(dish_row.elem ->> 'name', 'Untitled dish'),
            normalized_status,
            nullif(dish_row.elem ->> 'dish_date', '')::date,
            dish_row.elem ->> 'recipe',
            nullif(dish_row.elem ->> 'calories', '')::integer,
            nullif(dish_row.elem ->> 'proteins', '')::integer,
            nullif(dish_row.elem ->> 'fats', '')::integer,
            nullif(dish_row.elem ->> 'carbs', '')::integer,
            nullif(dish_row.elem ->> 'created_by', '')::bigint,
            dish_row.ordinality::integer
          )
          returning id into new_plan_dish_id;

          if dish_row.elem ? 'ingredients' then
            for ing_row in
              select ing_elem
              from jsonb_array_elements(dish_row.elem -> 'ingredients') as ing(ing_elem)
            loop
              ing_uuid := nullif(ing_row.ing_elem ->> 'id', '')::uuid;
              if ing_uuid is not null then
                select id into ing_uuid from ingredients where id = ing_uuid;
              end if;

              insert into weekly_plan_ingredients (
                plan_dish_id,
                ingredient_id,
                name,
                amount,
                unit,
                is_purchased
              ) values (
                new_plan_dish_id,
                ing_uuid,
                coalesce(ing_row.ing_elem ->> 'name', 'Ingredient'),
                ing_row.ing_elem ->> 'amount',
                ing_row.ing_elem ->> 'unit',
                coalesce((ing_row.ing_elem ->> 'is_purchased')::boolean, false)
              );
            end loop;
          end if;
        end loop;
      end loop;
    end if;
  end if;
end $$;

-- 4. Миграция данных из dish_cache.ingredients (jsonb)
do $$
begin
  if exists(select 1 from information_schema.columns where table_name = 'dish_cache' and column_name = 'ingredients') then
    if not exists(select 1 from dish_cache_ingredients) then
      insert into dish_cache_ingredients (cache_id, name, amount, unit)
      select
        dc.id,
        coalesce(ing.elem ->> 'name', 'Ingredient'),
        ing.elem ->> 'amount',
        ing.elem ->> 'unit'
      from dish_cache dc
      cross join lateral jsonb_array_elements(dc.ingredients) as ing(elem)
      where dc.ingredients is not null;
    end if;
  end if;
end $$;

-- 5. Удаляем денормализованные колонки после миграции
alter table if exists weekly_plans drop column if exists dishes;
alter table if exists dish_cache drop column if exists ingredients;

-- 6. Включаем RLS и политики для новых таблиц
alter table weekly_plan_dishes enable row level security;
alter table weekly_plan_ingredients enable row level security;
alter table dish_cache_ingredients enable row level security;

-- Политики для weekly_plan_dishes
drop policy if exists "Users can view their couple's weekly plan dishes" on weekly_plan_dishes;
drop policy if exists "Users can manage their couple's weekly plan dishes" on weekly_plan_dishes;
create policy "Users can view their couple's weekly plan dishes" on weekly_plan_dishes for select using (true);
create policy "Users can manage their couple's weekly plan dishes" on weekly_plan_dishes for all using (true);

-- Политики для weekly_plan_ingredients
drop policy if exists "Users can view their couple's weekly plan ingredients" on weekly_plan_ingredients;
drop policy if exists "Users can manage their couple's weekly plan ingredients" on weekly_plan_ingredients;
create policy "Users can view their couple's weekly plan ingredients" on weekly_plan_ingredients for select using (true);
create policy "Users can manage their couple's weekly plan ingredients" on weekly_plan_ingredients for all using (true);

-- Политики для dish_cache_ingredients (аналогично dish_cache)
drop policy if exists "Anyone can read dish cache ingredients" on dish_cache_ingredients;
drop policy if exists "Service role can manage dish cache ingredients" on dish_cache_ingredients;
create policy "Anyone can read dish cache ingredients" on dish_cache_ingredients for select using (true);
create policy "Service role can manage dish cache ingredients" on dish_cache_ingredients for all using (true);


