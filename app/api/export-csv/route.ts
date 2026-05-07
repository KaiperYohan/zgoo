import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  parseCompanyFilters,
  applyCompanyFilters,
  fetchNoteMatchingCompanyIds,
  SP,
} from '@/lib/parseCompanyFilters'
import { regionFromAddress } from '@/lib/filters'
import { CompanyEnriched, STAGE_LABELS, Stage } from '@/lib/types'

const MAX_ROWS = 1000

// CSV columns are written in this order. Koren headers so the file opens
// cleanly in Excel for the team.
const COLUMNS: { header: string; get: (c: Row) => string | number | null }[] = [
  { header: '업체명',         get: (c) => c.name },
  { header: '산업',           get: (c) => c.industry },
  { header: '지역',           get: (c) => regionFromAddress(c.address) },
  { header: '대표자',         get: (c) => c.ceo_name },
  { header: '단계',           get: (c) => STAGE_LABELS[c.stage as Stage] ?? c.stage },
  { header: '매출액(원)',     get: (c) => c.revenue_krw },
  { header: 'YoY성장률(%)',   get: (c) => c.revenue_growth_pct },
  { header: '영업이익률(%)',  get: (c) => c.ebitda_pct },
  { header: '흑자연수',       get: (c) => c.positive_ops_years },
  { header: '부채비율(%)',    get: (c) => c.debt_ratio_latest },
  { header: '직원수',         get: (c) => c.employees },
  { header: '설립연도',       get: (c) => c.founded },
  { header: '현금흐름등급',   get: (c) => c.cash_flow_grade },
  { header: '기업규모',       get: (c) => c.company_size },
  { header: '법인번호',       get: (c) => c.corp_reg_no },
  { header: '사업자번호',     get: (c) => c.biz_reg_no },
  { header: '전화번호',       get: (c) => c.phone },
  { header: '이메일',         get: (c) => c.email },
  { header: '주소',           get: (c) => c.address },
]

type Row = CompanyEnriched

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // RFC 4180: wrap in quotes when the cell contains a comma, quote, or newline.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Parse the same query params the /companies page uses, so the export
  // mirrors the user's current search exactly.
  const url = new URL(req.url)
  const sp: SP = {}
  for (const [k, v] of url.searchParams.entries()) {
    sp[k] = v
  }
  const filters = parseCompanyFilters(sp)
  const noteMatchIds = await fetchNoteMatchingCompanyIds(supabase, filters.q)

  const sortRaw = (url.searchParams.get('sort') ?? 'name') as keyof Row
  const dir = url.searchParams.get('dir') === 'desc' ? 'desc' : 'asc'

  let query = supabase
    .from('companies_enriched')
    .select('*')
    .order(sortRaw as string, { ascending: dir === 'asc', nullsFirst: false })
    .order('id', { ascending: true })
    .range(0, MAX_ROWS - 1)
  query = applyCompanyFilters(query, filters, noteMatchIds)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const rows = (data ?? []) as Row[]

  const headerLine = COLUMNS.map((c) => csvEscape(c.header)).join(',')
  const bodyLines = rows.map((r) => COLUMNS.map((c) => csvEscape(c.get(r))).join(','))
  // UTF-8 BOM so Excel on Windows opens Korean text correctly.
  const csv = '﻿' + [headerLine, ...bodyLines].join('\r\n')

  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const filename = `companies_${ts}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}
