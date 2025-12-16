-- Add КБЖУ (calories, proteins, fats, carbs) fields to dishes and dish_cache tables
alter table if exists dishes
  add column if not exists proteins integer,
  add column if not exists fats integer,
  add column if not exists carbs integer;

alter table if exists dish_cache
  add column if not exists proteins integer,
  add column if not exists fats integer,
  add column if not exists carbs integer;
