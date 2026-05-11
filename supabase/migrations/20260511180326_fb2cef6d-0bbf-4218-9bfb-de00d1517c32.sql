
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  github_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- auto-create profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url');
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- repo_scans
create table public.repo_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repo_url text not null,
  repo_name text,
  owner text,
  summary text,
  results jsonb default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.repo_scans enable row level security;
create policy "scans_select_own" on public.repo_scans for select using (auth.uid() = user_id);
create policy "scans_insert_own" on public.repo_scans for insert with check (auth.uid() = user_id);
create policy "scans_update_own" on public.repo_scans for update using (auth.uid() = user_id);
create policy "scans_delete_own" on public.repo_scans for delete using (auth.uid() = user_id);
create index repo_scans_user_idx on public.repo_scans(user_id, created_at desc);

-- chat threads
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repo_scan_id uuid references public.repo_scans(id) on delete set null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chat_threads enable row level security;
create policy "threads_select_own" on public.chat_threads for select using (auth.uid() = user_id);
create policy "threads_insert_own" on public.chat_threads for insert with check (auth.uid() = user_id);
create policy "threads_update_own" on public.chat_threads for update using (auth.uid() = user_id);
create policy "threads_delete_own" on public.chat_threads for delete using (auth.uid() = user_id);

-- chat messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  parts jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "messages_select_own" on public.chat_messages for select using (auth.uid() = user_id);
create policy "messages_insert_own" on public.chat_messages for insert with check (auth.uid() = user_id);
create policy "messages_delete_own" on public.chat_messages for delete using (auth.uid() = user_id);
create index chat_messages_thread_idx on public.chat_messages(thread_id, created_at);

-- user settings
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  github_pat text,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "settings_upsert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.user_settings for update using (auth.uid() = user_id);
