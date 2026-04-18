#!/usr/bin/env node
// Import KODATA xlsx into Supabase.
// Usage: node scripts/import-kodata.mjs "<path to xlsx>"
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (service role bypasses RLS and
// is needed for bulk import). Also reads NEXT_PUBLIC_SUPABASE_URL from .env.local.

import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const envFile = await readFile('.env.local', 'utf8');
const env = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const path = process.argv[2];
if (!path) {
  console.error('Usage: node scripts/import-kodata.mjs <path>');
  process.exit(1);
}

const clean = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};
const num = (v) => {
  const s = clean(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const int = (v) => {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
};
const yyyymmddToDate = (v) => {
  const s = clean(v);
  if (!s || s.length !== 8) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};
const foundingYear = (v) => {
  const s = clean(v);
  if (!s || s.length < 4) return null;
  const y = parseInt(s.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
};

function buildCompany(r) {
  return {
    corp_reg_no: clean(r['법인번호']),
    biz_reg_no: clean(r['사업자번호']),
    name: clean(r['업체명']),
    industry: clean(r['업종명11차']),
    industry_code: clean(r['업종코드11차']),
    address: clean(r['도로명주소']),
    ceo_name: clean(r['대표자명']),
    phone: clean(r['전화번호']),
    employees: int(r['종업원수_최근']) ?? int(r['국민연금종업원수_최근']),
    founded: foundingYear(r['설립일자']),
    cash_flow_grade: clean(r['현금흐름등급_최근']),
    company_size: clean(r['기업규모']),
    company_type: clean(r['기업유형']),
    legal_form: clean(r['기업형태']),
    settlement_date: yyyymmddToDate(r['결산기준일']),
    // KODATA values are in 천원; companies.revenue_krw column is in KRW (matches seed).
    revenue_krw: (() => {
      const v = int(r['매출액_2025']);
      return v === null ? null : v * 1000;
    })(),
    ebitda_pct: num(r['영업이익률_2025']),
    stage: 'pool',
  };
}

function buildFinancials(companyId, r) {
  const years = [2025, 2024, 2023];
  const rows = [];
  for (const y of years) {
    const row = {
      company_id: companyId,
      fiscal_year: y,
      assets: int(r[`자산_${y}`]),
      current_assets: int(r[`유동자산_${y}`]),
      liabilities: int(r[`부채_${y}`]),
      current_liab: int(r[`유동부채_${y}`]),
      short_term_debt: int(r[`단기차입금_${y}`]),
      short_term_bonds: int(r[`단기사채_${y}`]),
      current_ltd: int(r[`유동성장기부채_${y}`]),
      bonds: int(r[`사채_${y}`]),
      long_term_debt: int(r[`장기차입금1_${y}`]),
      equity: int(r[`자본_${y}`]),
      capital_stock: int(r[`자본금_${y}`]),
      revenue: int(r[`매출액_${y}`]),
      cogs: int(r[`매출원가_${y}`]),
      gross_profit: int(r[`매출총이익손실_${y}`]),
      sga: int(r[`판매비와관리비_${y}`]),
      operating_income: int(r[`영업이익손실_${y}`]),
      pretax_income: int(r[`법인세비용차감전순손익_${y}`]),
      net_income: int(r[`손익당기순이익순손실_${y}`]),
      operating_margin: num(r[`영업이익률_${y}`]),
      debt_dependency: num(r[`차입금의존도_${y}`]),
      debt_ratio: num(r[`부채비율_전체_${y}`]),
    };
    // skip rows where all financial values are null
    const hasData = Object.entries(row).some(
      ([k, v]) => k !== 'company_id' && k !== 'fiscal_year' && v !== null
    );
    if (hasData) rows.push(row);
  }
  return rows;
}

function buildOwners(companyId, r) {
  const out = [];
  const lead = clean(r['대표주주명']);
  const leadKind = clean(r['대표주주구분']);
  if (lead) {
    out.push({
      company_id: companyId,
      name: lead,
      relationship: leadKind ? `대표주주 (${leadKind})` : '대표주주',
    });
  }
  for (let i = 1; i <= 5; i++) {
    const n = clean(r[`주주명_${i}`]);
    if (n && n !== lead) out.push({ company_id: companyId, name: n, relationship: '주주' });
  }
  // dedupe by (name, relationship)
  const seen = new Set();
  return out.filter((o) => {
    const k = `${o.name}|${o.relationship}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function chunkedUpsert(table, rows, { onConflict, chunkSize = 500 }) {
  let done = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await sb
      .from(table)
      .upsert(chunk, { onConflict, ignoreDuplicates: false });
    if (error) {
      console.error(`\n[${table}] upsert error at batch ${i}:`, error.message);
      process.exit(1);
    }
    done += chunk.length;
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}`);
  }
  process.stdout.write('\n');
}

async function main() {
  console.log('Reading xlsx…');
  const buf = await readFile(path);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, blankrows: false });
  console.log(`  ${rows.length} rows`);

  // 1. Build companies, filter out rows without corp_reg_no or name
  const companies = [];
  const rowByCorp = new Map();
  for (const r of rows) {
    const c = buildCompany(r);
    if (!c.corp_reg_no || !c.name) continue;
    if (rowByCorp.has(c.corp_reg_no)) continue; // dedupe within file
    rowByCorp.set(c.corp_reg_no, r);
    companies.push(c);
  }
  console.log(`Companies to upsert: ${companies.length}`);

  console.log('Upserting companies…');
  await chunkedUpsert('companies', companies, { onConflict: 'corp_reg_no' });

  // 2. Fetch back id per corp_reg_no via paginated select (avoid long .in() URLs)
  console.log('Fetching company ids…');
  const idByCorp = new Map();
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from('companies')
      .select('id, corp_reg_no')
      .not('corp_reg_no', 'is', null)
      .order('corp_reg_no', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.error('id fetch error:', error.message ?? error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    for (const row of data) idByCorp.set(row.corp_reg_no, row.id);
    offset += data.length;
    process.stdout.write(`\r  ${idByCorp.size}`);
    if (data.length < pageSize) break;
  }
  process.stdout.write('\n');

  // 3. Build financials & owners keyed by id
  const allFinancials = [];
  const allOwners = [];
  for (const [corpNo, r] of rowByCorp.entries()) {
    const id = idByCorp.get(corpNo);
    if (!id) continue;
    allFinancials.push(...buildFinancials(id, r));
    allOwners.push(...buildOwners(id, r));
  }
  console.log(`Financials: ${allFinancials.length}, Owners: ${allOwners.length}`);

  console.log('Upserting financials…');
  await chunkedUpsert('company_financials', allFinancials, {
    onConflict: 'company_id,fiscal_year',
  });

  console.log('Upserting owners…');
  await chunkedUpsert('owners', allOwners, {
    onConflict: 'company_id,name,relationship',
  });

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
