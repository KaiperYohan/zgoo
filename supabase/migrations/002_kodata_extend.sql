-- Extend schema for KODATA import (외감법인 공시 데이터)
-- Monetary values are stored as integers in 천원 (thousands of KRW), per KODATA convention.

alter table companies
  alter column ebitda_pct type numeric(12,2),
  add column if not exists corp_reg_no       text,
  add column if not exists biz_reg_no        text,
  add column if not exists address           text,
  add column if not exists ceo_name          text,
  add column if not exists phone             text,
  add column if not exists industry_code     text,
  add column if not exists cash_flow_grade   text,
  add column if not exists company_size      text,
  add column if not exists company_type      text,
  add column if not exists legal_form        text,
  add column if not exists settlement_date   date;

create unique index if not exists companies_corp_reg_no_key
  on companies(corp_reg_no);

create table if not exists company_financials (
  company_id         uuid not null references companies(id) on delete cascade,
  fiscal_year        integer not null,
  assets             bigint,
  current_assets     bigint,
  liabilities        bigint,
  current_liab       bigint,
  short_term_debt    bigint,
  short_term_bonds   bigint,
  current_ltd        bigint,
  bonds              bigint,
  long_term_debt    bigint,
  equity             bigint,
  capital_stock      bigint,
  revenue            bigint,
  cogs               bigint,
  gross_profit       bigint,
  sga                bigint,
  operating_income   bigint,
  pretax_income      bigint,
  net_income         bigint,
  operating_margin   numeric(14,2),
  debt_dependency    numeric(14,2),
  debt_ratio         numeric(16,2),
  primary key (company_id, fiscal_year)
);

alter table company_financials enable row level security;
create policy "Authenticated users can manage financials" on company_financials
  for all using (auth.role() = 'authenticated');

-- Owners: prevent dup shareholders on re-import. Importer always sets relationship,
-- so a plain unique index works for ON CONFLICT.
create unique index if not exists owners_company_name_rel_key
  on owners(company_id, name, relationship);
