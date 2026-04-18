-- Enriched view joining companies with their latest 3 years of financials.
-- Used by the companies list page for M&A screening filters:
--   revenue_growth_pct  : YoY revenue growth (2024 → 2025)
--   positive_ops_years  : count of 2023/2024/2025 with positive 영업이익
--   debt_ratio_latest   : latest (2025) 부채비율

create or replace view companies_enriched as
select
  c.*,
  f25.revenue          as rev_2025_thousand,
  f24.revenue          as rev_2024_thousand,
  f23.revenue          as rev_2023_thousand,
  f25.operating_income as op_2025_thousand,
  f24.operating_income as op_2024_thousand,
  f23.operating_income as op_2023_thousand,
  case
    when f24.revenue is not null and f24.revenue <> 0 and f25.revenue is not null
      then round(((f25.revenue::numeric - f24.revenue) * 100.0 / abs(f24.revenue))::numeric, 2)
    else null
  end as revenue_growth_pct,
  (
    (case when f23.operating_income > 0 then 1 else 0 end)
    + (case when f24.operating_income > 0 then 1 else 0 end)
    + (case when f25.operating_income > 0 then 1 else 0 end)
  ) as positive_ops_years,
  f25.debt_ratio as debt_ratio_latest
from companies c
left join company_financials f25 on f25.company_id = c.id and f25.fiscal_year = 2025
left join company_financials f24 on f24.company_id = c.id and f24.fiscal_year = 2024
left join company_financials f23 on f23.company_id = c.id and f23.fiscal_year = 2023;

-- Views in Supabase don't enable RLS directly; they inherit from underlying tables' RLS.
-- Ensure the view is accessible to authenticated users via anon grants (PostgREST needs this).
grant select on companies_enriched to authenticated;
grant select on companies_enriched to anon;
