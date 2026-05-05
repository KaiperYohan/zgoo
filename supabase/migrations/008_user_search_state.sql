-- Per-user "last search" memory. The companies page has many filter params
-- (q, stage, rev_min/max, region, growth, debt, etc.) that are encoded into
-- the URL. We persist the most recent encoded query so a user who navigates
-- away and returns to /companies lands back on their previous search.
--
-- Single row per user — we don't track full history yet. If we ever want a
-- list of recent searches, this becomes a table with multiple rows per user.

create table if not exists user_search_state (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  query       text not null default '',
  updated_at  timestamptz default now()
);

alter table user_search_state enable row level security;

-- Each user reads/writes only their own row.
create policy "Self read search state" on user_search_state
  for select using (user_id = auth.uid());

create policy "Self insert search state" on user_search_state
  for insert with check (
    user_id = auth.uid() and public.is_approved_user(auth.uid())
  );

create policy "Self update search state" on user_search_state
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Self delete search state" on user_search_state
  for delete using (user_id = auth.uid());
