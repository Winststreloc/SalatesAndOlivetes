-- Add day_of_week column to dishes table
-- 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
-- NULL means "Just an idea" (unscheduled)

alter table dishes 
add column if not exists day_of_week integer check (day_of_week >= 0 and day_of_week <= 6);


