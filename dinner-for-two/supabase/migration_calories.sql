-- Add calories estimation storage for dishes and AI cache
alter table if exists dishes
  add column if not exists calories integer;

alter table if exists dish_cache
  add column if not exists calories integer;


