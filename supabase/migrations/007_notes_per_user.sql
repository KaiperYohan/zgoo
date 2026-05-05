-- Notes become a per-user comment thread per company. Multiple rows per
-- company are now expected; each row is owned by the user who wrote it.

alter table notes
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz default now();

-- Best-effort backfill so legacy rows have a created_at (we use updated_at
-- as the proxy). user_id stays null for legacy rows; the UI shows them as
-- '(legacy)' until/unless an admin attributes them.
update notes set created_at = updated_at where created_at is null;

create index if not exists notes_company_idx on notes(company_id);
create index if not exists notes_user_idx on notes(user_id);

-- Replace the "approved can do everything" policy with granular ones: anyone
-- approved can read every note (so the thread is visible to the team), but a
-- user can only insert/update/delete their own row.
drop policy if exists "Authenticated users can manage notes" on notes;
drop policy if exists "Approved manage notes" on notes;

create policy "Approved read notes" on notes
  for select using (public.is_approved_user(auth.uid()));

create policy "Self insert notes" on notes
  for insert with check (
    public.is_approved_user(auth.uid()) and user_id = auth.uid()
  );

create policy "Self update notes" on notes
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Self delete notes" on notes
  for delete using (user_id = auth.uid());
