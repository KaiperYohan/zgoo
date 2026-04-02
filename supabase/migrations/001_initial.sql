create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  industry    text,
  revenue_krw bigint,
  fcf_krw     bigint,
  ebitda_pct  numeric(5,2),
  employees   integer,
  founded     integer,
  stage       text not null default 'watchlist',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table owners (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references companies(id) on delete cascade,
  name            text not null,
  age             integer,
  phone           text,
  email           text,
  background      text,
  relationship    text,
  created_at      timestamptz default now()
);

create table activities (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  type        text,
  body        text not null,
  occurred_at timestamptz default now(),
  created_at  timestamptz default now()
);

create table notes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  body        text not null,
  updated_at  timestamptz default now()
);

-- RLS policies
alter table companies enable row level security;
alter table owners enable row level security;
alter table activities enable row level security;
alter table notes enable row level security;

-- Allow authenticated users full access
create policy "Authenticated users can manage companies" on companies
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users can manage owners" on owners
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users can manage activities" on activities
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users can manage notes" on notes
  for all using (auth.role() = 'authenticated');
