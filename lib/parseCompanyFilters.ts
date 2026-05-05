// Shared filter parsing + application. Used by both the companies list (GET)
// and the bulk stage-update endpoint (POST) so they filter identically.

import { SupabaseClient } from '@supabase/supabase-js'
import { STAGES, Stage } from './types'
import { REGIONS, CF_GRADES, UK_TO_KRW } from './filters'

export type SP = Record<string, string | string[] | undefined>

const getParam = (sp: SP, k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k])
const getList = (sp: SP, k: string): string[] => {
  const v = getParam(sp, k)
  return v ? v.split(',').filter(Boolean) : []
}
const getNum = (sp: SP, k: string): number | null => {
  const v = getParam(sp, k)
  if (v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function parseCompanyFilters(sp: SP) {
  const q = (getParam(sp, 'q') ?? '').toString().trim()
  const stageRaw = (getParam(sp, 'stage') ?? '') as Stage | ''
  const stage: Stage | '' = STAGES.includes(stageRaw as Stage) ? (stageRaw as Stage) : ''
  return {
    q,
    stage,
    revMin: getNum(sp, 'rev_min'),
    revMax: getNum(sp, 'rev_max'),
    empMin: getNum(sp, 'emp_min'),
    empMax: getNum(sp, 'emp_max'),
    marMin: getNum(sp, 'mar_min'),
    marMax: getNum(sp, 'mar_max'),
    foundedFrom: getNum(sp, 'founded_from'),
    foundedTo: getNum(sp, 'founded_to'),
    growthMin: getNum(sp, 'growth_min'),
    growthMax: getNum(sp, 'growth_max'),
    profitYearsMin: getNum(sp, 'profit_min'),
    debtMax: getNum(sp, 'debt_max'),
    regions: getList(sp, 'regions').filter((r) => (REGIONS as readonly string[]).includes(r)),
    grades: getList(sp, 'grades').filter((g) => (CF_GRADES as readonly string[]).includes(g)),
    industry: (getParam(sp, 'industry') ?? '').toString().trim(),
  }
}

export type CompanyFilters = ReturnType<typeof parseCompanyFilters>

export function sanitizeForIlike(s: string): string {
  return s.replace(/[,%_]/g, (c) => (c === ',' ? ' ' : '\\' + c))
}

// Free-text search now also matches the body of any note attached to a
// company. We do that as a separate `notes` query and OR the resulting
// company_ids into the main filter.
const NOTES_MATCH_CAP = 500

export async function fetchNoteMatchingCompanyIds(
  supabase: SupabaseClient,
  rawQ: string
): Promise<string[]> {
  if (!rawQ) return []
  const s = sanitizeForIlike(rawQ)
  const { data } = await supabase
    .from('notes')
    .select('company_id')
    .ilike('body', `%${s}%`)
    .limit(NOTES_MATCH_CAP)
  return Array.from(new Set((data ?? []).map((r) => r.company_id as string)))
}

// Apply filters to a Supabase query builder on `companies_enriched`.
// Works for both select('*') and select('id') etc.
// Returns the chained query (continue with .order/.range/etc).
//
// `noteMatchIds`: optional list of company_ids whose notes contain `q`. Pass
// the result of fetchNoteMatchingCompanyIds() here to make the search
// match note bodies in addition to the company-table columns below.
export function applyCompanyFilters<T>(
  builder: T,
  p: CompanyFilters,
  noteMatchIds: string[] = []
): T {
  // Cast to any for the fluent chain — all the methods we call exist on the
  // Supabase PostgrestFilterBuilder; narrowing is not worth the hassle.
  let q = builder as unknown as {
    eq: (c: string, v: unknown) => typeof q
    or: (s: string) => typeof q
    gte: (c: string, v: unknown) => typeof q
    lte: (c: string, v: unknown) => typeof q
    ilike: (c: string, v: string) => typeof q
    in: (c: string, v: unknown[]) => typeof q
  }

  if (p.stage) q = q.eq('stage', p.stage)
  if (p.q) {
    const s = sanitizeForIlike(p.q)
    const parts = [
      `name.ilike.%${s}%`,
      `industry.ilike.%${s}%`,
      `ceo_name.ilike.%${s}%`,
      `corp_reg_no.ilike.%${s}%`,
      `biz_reg_no.ilike.%${s}%`,
    ]
    if (noteMatchIds.length) {
      parts.push(`id.in.(${noteMatchIds.join(',')})`)
    }
    q = q.or(parts.join(','))
  }
  if (p.revMin !== null) q = q.gte('revenue_krw', p.revMin * UK_TO_KRW)
  if (p.revMax !== null) q = q.lte('revenue_krw', p.revMax * UK_TO_KRW)
  if (p.empMin !== null) q = q.gte('employees', p.empMin)
  if (p.empMax !== null) q = q.lte('employees', p.empMax)
  if (p.marMin !== null) q = q.gte('ebitda_pct', p.marMin)
  if (p.marMax !== null) q = q.lte('ebitda_pct', p.marMax)
  if (p.foundedFrom !== null) q = q.gte('founded', p.foundedFrom)
  if (p.foundedTo !== null) q = q.lte('founded', p.foundedTo)
  if (p.growthMin !== null) q = q.gte('revenue_growth_pct', p.growthMin)
  if (p.growthMax !== null) q = q.lte('revenue_growth_pct', p.growthMax)
  if (p.profitYearsMin !== null) q = q.gte('positive_ops_years', p.profitYearsMin)
  if (p.debtMax !== null) q = q.lte('debt_ratio_latest', p.debtMax)
  if (p.industry) {
    const s = sanitizeForIlike(p.industry)
    q = q.ilike('industry', `%${s}%`)
  }
  if (p.grades.length) q = q.in('cash_flow_grade', p.grades)
  if (p.regions.length) {
    const parts = p.regions.map((r) => `address.ilike.${r}%`).join(',')
    q = q.or(parts)
  }
  return q as T
}

// Page through all matching IDs by repeatedly calling .range().
// Used for bulk operations where we need every ID, not just one page.
export async function collectAllMatchingIds(
  supabase: SupabaseClient,
  p: CompanyFilters,
  maxIds = 50000
): Promise<string[]> {
  const noteMatchIds = await fetchNoteMatchingCompanyIds(supabase, p.q)
  const ids: string[] = []
  const pageSize = 1000
  let offset = 0
  while (ids.length < maxIds) {
    let builder = supabase
      .from('companies_enriched')
      .select('id')
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1)
    builder = applyCompanyFilters(builder, p, noteMatchIds)
    const { data, error } = await builder
    if (error) throw error
    if (!data || data.length === 0) break
    for (const row of data as Array<{ id: string }>) ids.push(row.id)
    if (data.length < pageSize) break
    offset += data.length
  }
  return ids
}
