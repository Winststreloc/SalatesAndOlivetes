-- Add created_by column to dishes table to track who created the dish
alter table dishes add column if not exists created_by bigint references users(telegram_id);

