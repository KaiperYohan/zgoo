-- Extend field_requests so it can target owner fields too. company_id stays
-- required (every owner belongs to a company, and we need it for scoping/RLS).
-- owner_id is set when the request is for a row in the owners table; null
-- means the request is for a column on companies.

alter table field_requests
  add column if not exists owner_id uuid references owners(id) on delete cascade;

-- The original partial unique index covered (company_id, field_key) for
-- pending. Now field_key collides between e.g. companies.phone and owners.phone,
-- so we split it: one index for company-level requests, one for owner-level.
drop index if exists field_requests_unique_pending;

create unique index if not exists field_requests_company_unique_pending
  on field_requests(company_id, field_key)
  where status = 'pending' and owner_id is null;

create unique index if not exists field_requests_owner_unique_pending
  on field_requests(owner_id, field_key)
  where status = 'pending' and owner_id is not null;
