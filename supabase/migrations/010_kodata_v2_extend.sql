-- Extend schema for KODATA v2 (외감법인 전체 DATA v2 0-20260506).
-- Adds: company email, cash-flow statement (3yr × 5 lines), shareholder pct,
-- supplier/customer top-5, related-company links (관계사), and parsed executives
-- from the free-text 경영진 column.
-- Monetary values stay in 천원 (per existing KODATA convention on financials).

alter table companies
  add column if not exists email             text,
  add column if not exists executives_raw    text,
  add column if not exists shareholder_count integer;

alter table company_financials
  add column if not exists operating_cash_flow   bigint,
  add column if not exists investing_cash_flow   bigint,
  add column if not exists financing_cash_flow   bigint,
  add column if not exists other_cash_flow       bigint,
  add column if not exists non_cash_transactions bigint;

-- Lead shareholder + top-5 ownership %s come from 지분율_1..5 in the source.
-- The lead row gets the pct from whichever 주주명_K matches 대표주주명.
alter table owners
  add column if not exists ownership_pct numeric(7,4);

-- 구매처명_1..5 / 판매처명_1..5 → unified table keyed by (kind, rank).
create table if not exists company_trade_partners (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  kind        text not null check (kind in ('supplier', 'customer')),
  rank        smallint not null,
  name        text not null,
  unique (company_id, kind, rank)
);

-- 관계사1..5_상호 / 관계사1..5_사업자번호. biz_reg_no is a soft pointer; the UI
-- joins back to companies on biz_reg_no when available.
create table if not exists related_companies (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  rank          smallint not null,
  name          text not null,
  biz_reg_no    text,
  unique (company_id, rank)
);

-- 경영진 is a free-text comma list like "대표이사 박병태, 감사 반대성, ..."
-- Importer parses into role + name; if it can't, role stays null and the whole
-- entry goes in name. The original string is kept on companies.executives_raw.
create table if not exists executives (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  rank        smallint not null,
  role        text,
  name        text not null,
  unique (company_id, rank)
);

create index if not exists company_trade_partners_company_idx on company_trade_partners(company_id);
create index if not exists related_companies_company_idx      on related_companies(company_id);
create index if not exists executives_company_idx             on executives(company_id);
create index if not exists related_companies_biz_reg_no_idx   on related_companies(biz_reg_no);

alter table company_trade_partners enable row level security;
alter table related_companies      enable row level security;
alter table executives             enable row level security;

create policy "Approved manage trade partners" on company_trade_partners
  for all using (public.is_approved_user(auth.uid()))
  with check (public.is_approved_user(auth.uid()));

create policy "Approved manage related companies" on related_companies
  for all using (public.is_approved_user(auth.uid()))
  with check (public.is_approved_user(auth.uid()));

create policy "Approved manage executives" on executives
  for all using (public.is_approved_user(auth.uid()))
  with check (public.is_approved_user(auth.uid()));
