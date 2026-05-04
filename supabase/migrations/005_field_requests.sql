-- Field requests: when a user views a company and a field they care about is
-- empty, they can hit "Request" to flag it. Admins see pending requests on
-- /admin and fulfill them by typing the value (which writes back to the
-- company row and marks the request fulfilled).

create table if not exists field_requests (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  field_key     text not null,
  field_label   text not null,
  requested_by  uuid references auth.users(id) on delete set null,
  status        text not null default 'pending'
                  check (status in ('pending', 'fulfilled', 'dismissed')),
  note          text,
  created_at    timestamptz default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references auth.users(id)
);

create index if not exists field_requests_status_idx on field_requests(status);
create index if not exists field_requests_company_idx on field_requests(company_id);

-- One pending request per (company, field). Re-requesting silently dedupes.
create unique index if not exists field_requests_unique_pending
  on field_requests(company_id, field_key)
  where status = 'pending';

alter table field_requests enable row level security;

create policy "Approved read field_requests" on field_requests
  for select using (public.is_approved_user(auth.uid()));

create policy "Approved create field_requests" on field_requests
  for insert with check (
    public.is_approved_user(auth.uid()) and requested_by = auth.uid()
  );

create policy "Admins update field_requests" on field_requests
  for update using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins delete field_requests" on field_requests
  for delete using (public.is_admin(auth.uid()));
