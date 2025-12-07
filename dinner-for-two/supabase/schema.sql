-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: couples
create table if not exists couples (
  id uuid primary key default uuid_generate_v4(),
  invite_code uuid default uuid_generate_v4(),
  status text check (status in ('pending', 'active')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: users
create table if not exists users (
  telegram_id bigint primary key,
  first_name text,
  username text,
  photo_url text,
  couple_id uuid references couples(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: dishes
create table if not exists dishes (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references couples(id) not null,
  name text not null,
  status text check (status in ('proposed', 'selected', 'purchased')) default 'proposed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: ingredients
create table if not exists ingredients (
  id uuid primary key default uuid_generate_v4(),
  dish_id uuid references dishes(id) on delete cascade not null,
  name text not null,
  amount text,
  unit text,
  is_purchased boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Basic setup, specific policies depend on Auth implementation)
alter table couples enable row level security;
alter table users enable row level security;
alter table dishes enable row level security;
alter table ingredients enable row level security;

-- Example Policy (Adjust based on auth.uid() mapping to telegram_id or link)
-- create policy "Users can view their own data" on users for select using (true);

