import { parseCompanyFilters, type SP } from './parseCompanyFilters'
import { STAGE_LABELS, Stage } from './types'

// Turn a URL query string ("q=foo&stage=watchlist&rev_min=100") into a short
// human-friendly summary for the search-history dropdown.
//
// Returns short fragments like "검색 'foo' · Watchlist · 매출 ≥100억" — the
// caller renders them as plain text.
export function summarizeQuery(queryString: string): string {
  const params = new URLSearchParams(queryString)
  const sp: SP = {}
  for (const [k, v] of params) sp[k] = v

  const f = parseCompanyFilters(sp)
  const parts: string[] = []

  if (f.q) parts.push(`검색 '${f.q}'`)
  if (f.stage) parts.push(STAGE_LABELS[f.stage as Stage])
  if (f.industry) parts.push(`업종: ${f.industry}`)
  if (f.regions.length) parts.push(`지역: ${f.regions.join('/')}`)
  if (f.grades.length) parts.push(`등급: ${f.grades.join('/')}`)
  if (f.revMin !== null || f.revMax !== null) {
    parts.push(rangeLabel('매출', f.revMin, f.revMax, '억'))
  }
  if (f.empMin !== null || f.empMax !== null) {
    parts.push(rangeLabel('직원', f.empMin, f.empMax))
  }
  if (f.marMin !== null || f.marMax !== null) {
    parts.push(rangeLabel('마진', f.marMin, f.marMax, '%'))
  }
  if (f.foundedFrom !== null || f.foundedTo !== null) {
    parts.push(rangeLabel('설립', f.foundedFrom, f.foundedTo))
  }
  if (f.growthMin !== null || f.growthMax !== null) {
    parts.push(rangeLabel('YoY', f.growthMin, f.growthMax, '%'))
  }
  if (f.profitYearsMin !== null) parts.push(`흑자 ≥${f.profitYearsMin}년`)
  if (f.debtMax !== null) parts.push(`부채 ≤${f.debtMax}%`)

  if (parts.length === 0) return '(빈 검색)'
  return parts.join(' · ')
}

function rangeLabel(name: string, min: number | null, max: number | null, unit = ''): string {
  if (min !== null && max !== null) return `${name} ${min}~${max}${unit}`
  if (min !== null) return `${name} ≥${min}${unit}`
  return `${name} ≤${max}${unit}`
}
