-- Migration: Add dish_date column and migrate from day_of_week to dates
-- This migration converts the day_of_week system (0-6) to specific dates

-- 1. Add dish_date column
alter table dishes 
add column if not exists dish_date date;

-- 2. Create index for fast date lookups
create index if not exists idx_dishes_dish_date on dishes(dish_date);

-- 3. Migrate existing dishes with day_of_week to dates
-- For each dish with day_of_week, calculate the corresponding date:
-- - If dish was created recently (within last 7 days), use the nearest matching day of week
-- - If dish is older, use the current week's matching day
update dishes
set dish_date = (
    case
        -- If dish was created within last 7 days, use the nearest matching day
        when created_at >= current_date - interval '7 days' then
            -- Find the nearest matching day of week from creation date
            (created_at::date + (day_of_week - extract(dow from created_at)::int + 7) % 7)::date
        -- If dish is older, use current week's matching day
        else
            -- Get Monday of current week
            (current_date - (extract(dow from current_date)::int - 1 + 7) % 7)::date
            -- Add day_of_week to get the matching day
            + day_of_week
    end
)
where day_of_week is not null 
  and dish_date is null;

-- 4. For dishes without day_of_week, set dish_date to created_at date
update dishes
set dish_date = created_at::date
where day_of_week is null 
  and dish_date is null;

-- Note: We keep day_of_week column for backward compatibility during transition
-- It can be removed in a future migration if needed

