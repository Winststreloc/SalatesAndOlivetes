-- Add recipe column to dishes
alter table dishes add column if not exists recipe text;

