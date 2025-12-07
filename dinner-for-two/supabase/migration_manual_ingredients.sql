-- Create table for manual ingredients (added by user, not from dishes)
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

-- Create index for fast lookups
create index if not exists idx_manual_ingredients_couple on manual_ingredients(couple_id);

-- Enable RLS
alter table manual_ingredients enable row level security;

-- Basic RLS policies (temporary, may need refinement)
create policy "Users can manage their couple's manual ingredients" on manual_ingredients for all using (true);

-- Add trigger to update updated_at
create trigger update_manual_ingredients_updated_at before update on manual_ingredients
    for each row execute function update_updated_at_column();

