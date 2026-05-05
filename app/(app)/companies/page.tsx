import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompaniesTable } from './CompaniesTable'
import { CompanyEnriched, Owner } from '@/lib/types'
import {
  parseCompanyFilters,
  applyCompanyFilters,
  fetchNoteMatchingCompanyIds,
  SP,
} from '@/lib/parseCompanyFilters'

// Params we treat as "real" search state. If none are present we consider the
// URL bare and fall back to the user's saved last search.
const SEARCH_PARAM_KEYS = [
  'q', 'stage', 'page', 'sort', 'dir',
  'rev_min', 'rev_max', 'emp_min', 'emp_max', 'mar_min', 'mar_max',
  'founded_from', 'founded_to', 'growth_min', 'growth_max', 'profit_min',
  'debt_max', 'regions', 'grades', 'industry',
] as const

function hasAnySearchParam(sp: SP): boolean {
  return SEARCH_PARAM_KEYS.some((k) => {
    const v = sp[k]
    if (Array.isArray(v)) return v.some((x) => x && x.length)
    return typeof v === 'string' && v.length > 0
  })
}

const PAGE_SIZE = 50
const SORT_COLUMNS = [
  'name',
  'revenue_krw',
  'ebitda_pct',
  'employees',
  'founded',
  'stage',
  'created_at',
  'revenue_growth_pct',
  'positive_ops_years',
  'debt_ratio_latest',
] as const
type SortKey = (typeof SORT_COLUMNS)[number]

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  // If the URL has no search params, the user landed on /companies fresh
  // (sidebar nav, direct visit, etc.). Bounce them to their last saved search
  // so they don't lose context after visiting a company page. The ?fresh=1
  // sentinel and the explicit Reset button both bypass this — see the
  // CompaniesTable client for how that's wired.
  const isFresh = sp.fresh === '1' || (Array.isArray(sp.fresh) && sp.fresh.includes('1'))
  if (!hasAnySearchParam(sp) && !isFresh) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: saved } = await supabase
        .from('user_search_state')
        .select('query')
        .eq('user_id', user.id)
        .maybeSingle()
      if (saved?.query) {
        redirect(`/companies?${saved.query}`)
      }
    }
  }

  const filters = parseCompanyFilters(sp)
  const getParam = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k])
  const page = Math.max(1, parseInt(getParam('page') ?? '1', 10) || 1)
  const sortRaw = (getParam('sort') ?? 'name') as SortKey
  const sort: SortKey = SORT_COLUMNS.includes(sortRaw) ? sortRaw : 'name'
  const dir: 'asc' | 'desc' = getParam('dir') === 'desc' ? 'desc' : 'asc'

  const noteMatchIds = await fetchNoteMatchingCompanyIds(supabase, filters.q)

  let query = supabase
    .from('companies_enriched')
    .select('*', { count: 'exact' })
    .order(sort, { ascending: dir === 'asc', nullsFirst: false })
    .order('id', { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  query = applyCompanyFilters(query, filters, noteMatchIds)

  const { data: companies, count, error } = await query
  if (error) {
    return (
      <div className="p-6 text-sm text-red-600">
        Error loading companies: {error.message}
      </div>
    )
  }

  const ids = (companies ?? []).map((c) => c.id)
  const ownerByCompany = new Map<string, Owner>()
  if (ids.length) {
    const { data: owners } = await supabase
      .from('owners')
      .select('*')
      .in('company_id', ids)
    for (const o of owners ?? []) {
      const existing = ownerByCompany.get(o.company_id)
      const isLead = (o.relationship ?? '').startsWith('대표주주')
      const existingIsLead = existing && (existing.relationship ?? '').startsWith('대표주주')
      if (!existing || (isLead && !existingIsLead)) {
        ownerByCompany.set(o.company_id, o)
      }
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const watchedIds = new Set<string>()
  if (user && ids.length) {
    const { data: w } = await supabase
      .from('user_watchlist')
      .select('company_id')
      .eq('user_id', user.id)
      .in('company_id', ids)
    for (const row of w ?? []) watchedIds.add(row.company_id)
  }

  const rows = (companies ?? []).map((c: CompanyEnriched) => ({
    ...c,
    owner: ownerByCompany.get(c.id) ?? null,
    watched: watchedIds.has(c.id),
  }))

  return (
    <CompaniesTable
      initialCompanies={rows}
      total={count ?? 0}
      page={page}
      pageSize={PAGE_SIZE}
      q={filters.q}
      sort={sort}
      dir={dir}
      stage={filters.stage}
      filters={{
        revMin: filters.revMin, revMax: filters.revMax,
        empMin: filters.empMin, empMax: filters.empMax,
        marMin: filters.marMin, marMax: filters.marMax,
        foundedFrom: filters.foundedFrom, foundedTo: filters.foundedTo,
        growthMin: filters.growthMin,
        growthMax: filters.growthMax,
        profitYearsMin: filters.profitYearsMin,
        debtMax: filters.debtMax,
        regions: filters.regions, grades: filters.grades,
        industry: filters.industry,
      }}
    />
  )
}
