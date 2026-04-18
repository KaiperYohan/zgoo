import { createClient } from '@/lib/supabase/server'
import { CompaniesTable } from './CompaniesTable'
import { CompanyEnriched, Owner } from '@/lib/types'
import { parseCompanyFilters, applyCompanyFilters, SP } from '@/lib/parseCompanyFilters'

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
  const filters = parseCompanyFilters(sp)
  const getParam = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k])
  const page = Math.max(1, parseInt(getParam('page') ?? '1', 10) || 1)
  const sortRaw = (getParam('sort') ?? 'name') as SortKey
  const sort: SortKey = SORT_COLUMNS.includes(sortRaw) ? sortRaw : 'name'
  const dir: 'asc' | 'desc' = getParam('dir') === 'desc' ? 'desc' : 'asc'

  const supabase = await createClient()

  let query = supabase
    .from('companies_enriched')
    .select('*', { count: 'exact' })
    .order(sort, { ascending: dir === 'asc', nullsFirst: false })
    .order('id', { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  query = applyCompanyFilters(query, filters)

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

  const rows = (companies ?? []).map((c: CompanyEnriched) => ({
    ...c,
    owner: ownerByCompany.get(c.id) ?? null,
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
