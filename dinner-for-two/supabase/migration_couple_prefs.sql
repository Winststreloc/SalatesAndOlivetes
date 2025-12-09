-- Add preferences column to couples table
-- This stores couple-level settings like AI usage toggle
alter table couples add column if not exists preferences jsonb default '{"useAI": true}'::jsonb;

-- Create index for faster lookups (optional, but helpful)
create index if not exists idx_couples_preferences on couples using gin(preferences);

