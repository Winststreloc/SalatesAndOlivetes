-- Create table for caching AI-generated recipes and ingredients
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

-- Create index for fast lookups
create index if not exists idx_dish_cache_name_lang on dish_cache(dish_name_lower, lang);

-- Add trigger to update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger update_dish_cache_updated_at before update on dish_cache
    for each row execute function update_updated_at_column();

