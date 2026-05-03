-- Approval-gated auth + per-user watchlists.
--
-- Auth model: a row in auth.users alone does NOT grant access. The user must
-- have an app_users row with status='approved'. Trigger auto-creates a pending
-- row on signup; admins flip status via the /admin page.
--
-- Kanban model: companies are the shared deal pipeline. The kanban shows every
-- company that any user has watchlisted (i.e., companies that left the 'pool'
-- stage). Each user's personal page shows only what they themselves watchlisted.

create table if not exists app_users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  role          text not null default 'member'
                  check (role in ('member', 'admin')),
  created_at    timestamptz default now(),
  approved_at   timestamptz,
  approved_by   uuid references auth.users(id)
);

create index if not exists app_users_status_idx on app_users(status);

-- Auto-provision an app_users row whenever a new auth.users row appears.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Helpers used in RLS policies. SECURITY DEFINER so they can read app_users
-- without recursing into its own RLS.
create or replace function public.is_approved_user(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.app_users
    where id = uid and status = 'approved'
  );
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.app_users
    where id = uid and status = 'approved' and role = 'admin'
  );
$$;

grant execute on function public.is_approved_user(uuid) to authenticated, anon;
grant execute on function public.is_admin(uuid) to authenticated, anon;

-- Per-user watchlist (the user's personal saved-companies list).
create table if not exists user_watchlist (
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid not null references companies(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, company_id)
);

create index if not exists user_watchlist_company_idx on user_watchlist(company_id);

-- RLS
alter table app_users enable row level security;
alter table user_watchlist enable row level security;

-- A user can always read their own row (so /pending can read status).
create policy "Self read app_users" on app_users
  for select using (id = auth.uid());

-- Approved users can read everyone (for admin lists, user pages, watchlist owner display).
create policy "Approved read app_users" on app_users
  for select using (public.is_approved_user(auth.uid()));

-- Only admins can change status / role / display_name.
create policy "Admins update app_users" on app_users
  for update using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins delete app_users" on app_users
  for delete using (public.is_admin(auth.uid()));

-- Watchlist: approved users can see all entries (kanban needs the union);
-- a user can only insert/delete their own.
create policy "Approved read watchlist" on user_watchlist
  for select using (public.is_approved_user(auth.uid()));

create policy "Self insert watchlist" on user_watchlist
  for insert with check (
    user_id = auth.uid() and public.is_approved_user(auth.uid())
  );

create policy "Self delete watchlist" on user_watchlist
  for delete using (user_id = auth.uid());

-- Tighten existing tables: switch from "any authenticated" to "approved only".
drop policy if exists "Authenticated users can manage companies"  on companies;
drop policy if exists "Authenticated users can manage owners"     on owners;
drop policy if exists "Authenticated users can manage activities" on activities;
drop policy if exists "Authenticated users can manage notes"      on notes;
drop policy if exists "Authenticated users can manage financials" on company_financials;

create policy "Approved manage companies" on companies
  for all using (public.is_approved_user(auth.uid()))
  with check (public.is_approved_user(auth.uid()));
create policy "Approved manage owners" on owners
  for all using (public.is_approved_user(auth.uid()))
  with check (public.is_approved_user(auth.uid()));
create policy "Approved manage activities" on activities
  for all using (public.is_approved_user(auth.uid()))
  with check (public.is_approved_user(auth.uid()));
create policy "Approved manage notes" on notes
  for all using (public.is_approved_user(auth.uid()))
  with check (public.is_approved_user(auth.uid()));
create policy "Approved manage financials" on company_financials
  for all using (public.is_approved_user(auth.uid()))
  with check (public.is_approved_user(auth.uid()));

-- Backfill: every existing auth.users gets an approved app_users row, so the
-- RLS switchover doesn't lock current users out.
insert into app_users (id, email, status, role, approved_at)
select id, email, 'approved', 'member', now()
from auth.users
on conflict (id) do nothing;

-- Bootstrap the founding admin so /admin is reachable from day one.
update app_users
set role = 'admin',
    status = 'approved',
    approved_at = coalesce(approved_at, now())
where email = 'letmegeton@gmail.com';

-- Reset the kanban: drop everyone back to 'pool'. Watchlist promotion will
-- repopulate stages going forward.
update companies set stage = 'pool' where stage <> 'pool';
delete from user_watchlist;
