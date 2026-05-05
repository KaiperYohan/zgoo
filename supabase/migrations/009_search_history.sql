-- Replace the singleton "last search" with a full per-user history list,
-- like a browser's URL history. Same query → one row whose last_used_at
-- bumps each time the user re-runs it. The "redirect to last search" feature
-- now reads the row with the most recent last_used_at.

drop table if exists user_search_state;

create table if not exists search_history (
  user_id       uuid not null references auth.users(id) on delete cascade,
  query         text not null,
  last_used_at  timestamptz not null default now(),
  primary key (user_id, query)
);

create index if not exists search_history_recent_idx
  on search_history(user_id, last_used_at desc);

alter table search_history enable row level security;

-- Each user manages only their own history.
create policy "Self read history" on search_history
  for select using (user_id = auth.uid());

create policy "Self insert history" on search_history
  for insert with check (
    user_id = auth.uid() and public.is_approved_user(auth.uid())
  );

create policy "Self update history" on search_history
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Self delete history" on search_history
  for delete using (user_id = auth.uid());
