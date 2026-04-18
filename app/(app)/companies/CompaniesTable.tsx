'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  CompanyEnriched,
  Owner,
  STAGE_LABELS,
  STAGE_COLORS,
  STAGES,
  Stage,
} from '@/lib/types'
import { formatKRW, formatPct } from '@/lib/format'
import { regionFromAddress } from '@/lib/filters'
import { AddCompanyModal } from '@/components/AddCompanyModal'
import { FiltersPanel, FilterState } from './FiltersPanel'
import { NLSearchBar } from './NLSearchBar'

type CompanyWithOwner = CompanyEnriched & { owner?: Owner | null }
type SortKey =
  | 'name'
  | 'revenue_krw'
  | 'ebitda_pct'
  | 'employees'
  | 'founded'
  | 'stage'
  | 'created_at'
  | 'revenue_growth_pct'
  | 'positive_ops_years'
  | 'debt_ratio_latest'

interface Props {
  initialCompanies: CompanyWithOwner[]
  total: number
  page: number
  pageSize: number
  q: string
  sort: SortKey
  dir: 'asc' | 'desc'
  stage: Stage | ''
  filters: FilterState
}

export function CompaniesTable({
  initialCompanies,
  total,
  page,
  pageSize,
  q,
  sort,
  dir,
  stage,
  filters,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [showFilters, setShowFilters] = useState(hasActiveFilters(filters))
  const [searchInput, setSearchInput] = useState(q)
  const [bulkMoving, setBulkMoving] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  useEffect(() => {
    if (searchInput === q) return
    const t = setTimeout(() => {
      updateParams({ q: searchInput || null, page: '1' }, 'replace')
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  function updateParams(
    patch: Record<string, string | null>,
    mode: 'push' | 'replace' = 'push'
  ) {
    const params = new URLSearchParams()
    const current: Record<string, string | null> = {
      q: q || null,
      page: page > 1 ? String(page) : null,
      sort: sort !== 'name' ? sort : null,
      dir: dir !== 'asc' ? dir : null,
      stage: stage || null,
      rev_min: filters.revMin !== null ? String(filters.revMin) : null,
      rev_max: filters.revMax !== null ? String(filters.revMax) : null,
      emp_min: filters.empMin !== null ? String(filters.empMin) : null,
      emp_max: filters.empMax !== null ? String(filters.empMax) : null,
      mar_min: filters.marMin !== null ? String(filters.marMin) : null,
      mar_max: filters.marMax !== null ? String(filters.marMax) : null,
      founded_from: filters.foundedFrom !== null ? String(filters.foundedFrom) : null,
      founded_to: filters.foundedTo !== null ? String(filters.foundedTo) : null,
      growth_min: filters.growthMin !== null ? String(filters.growthMin) : null,
      growth_max: filters.growthMax !== null ? String(filters.growthMax) : null,
      profit_min: filters.profitYearsMin !== null ? String(filters.profitYearsMin) : null,
      debt_max: filters.debtMax !== null ? String(filters.debtMax) : null,
      regions: filters.regions.length ? filters.regions.join(',') : null,
      grades: filters.grades.length ? filters.grades.join(',') : null,
      industry: filters.industry || null,
    }
    const next = { ...current, ...patch }
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v)
    }
    const qs = params.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    startTransition(() => {
      if (mode === 'replace') router.replace(url)
      else router.push(url)
    })
  }

  const handleFilterChange = (patch: Partial<Record<keyof FilterState, string | null>>) => {
    const mapping: Record<string, string> = {
      revMin: 'rev_min', revMax: 'rev_max',
      empMin: 'emp_min', empMax: 'emp_max',
      marMin: 'mar_min', marMax: 'mar_max',
      foundedFrom: 'founded_from', foundedTo: 'founded_to',
      growthMin: 'growth_min',
      growthMax: 'growth_max',
      profitYearsMin: 'profit_min',
      debtMax: 'debt_max',
      regions: 'regions', grades: 'grades', industry: 'industry',
    }
    const urlPatch: Record<string, string | null> = { page: '1' }
    for (const [k, v] of Object.entries(patch)) {
      urlPatch[mapping[k] ?? k] = v
    }
    updateParams(urlPatch, 'replace')
  }

  // NL search returns the complete desired state — any field missing means
  // "not set", so we build a full URL patch that clears everything first and
  // then applies whatever Claude returned.
  const applyNLFilters = (parsed: Record<string, unknown> & { explanation?: unknown }) => {
    const patch: Record<string, string | null> = {
      q: null, stage: null,
      rev_min: null, rev_max: null, emp_min: null, emp_max: null,
      mar_min: null, mar_max: null, founded_from: null, founded_to: null,
      growth_min: null, growth_max: null, profit_min: null, debt_max: null,
      regions: null, grades: null, industry: null, page: '1',
    }
    const setIfNum = (dst: string, v: unknown) => {
      if (typeof v === 'number' && Number.isFinite(v)) patch[dst] = String(v)
    }
    const setIfStr = (dst: string, v: unknown) => {
      if (typeof v === 'string' && v.trim()) patch[dst] = v.trim()
    }
    const setIfArr = (dst: string, v: unknown) => {
      if (Array.isArray(v) && v.length) patch[dst] = v.filter((x) => typeof x === 'string').join(',')
    }
    setIfStr('q', parsed.q)
    setIfStr('stage', parsed.stage)
    setIfNum('rev_min', parsed.revMin)
    setIfNum('rev_max', parsed.revMax)
    setIfNum('emp_min', parsed.empMin)
    setIfNum('emp_max', parsed.empMax)
    setIfNum('mar_min', parsed.marMin)
    setIfNum('mar_max', parsed.marMax)
    setIfNum('founded_from', parsed.foundedFrom)
    setIfNum('founded_to', parsed.foundedTo)
    setIfNum('growth_min', parsed.growthMin)
    setIfNum('profit_min', parsed.profitYearsMin)
    setIfNum('debt_max', parsed.debtMax)
    setIfArr('regions', parsed.regions)
    setIfArr('grades', parsed.grades)
    setIfStr('industry', parsed.industry)
    updateParams(patch, 'replace')
    // keep the FiltersPanel open so the user can see/tweak what was applied
    setShowFilters(true)
    // sync the plain search box with whatever Claude set for q
    setSearchInput(typeof parsed.q === 'string' ? parsed.q : '')
  }

  const moveAllToWatchlist = async () => {
    const hasAnyFilter =
      !!q || !!stage || countActiveFilters(filters) > 0
    if (!hasAnyFilter) {
      setBulkError('필터를 적용해서 대상을 좁혀야 합니다 (실수 방지).')
      return
    }
    const confirmed = window.confirm(
      `현재 필터 결과(${total.toLocaleString()}개)를 모두 Watchlist로 이동하시겠습니까?`
    )
    if (!confirmed) return
    setBulkMoving(true)
    setBulkError(null)
    try {
      // Serialize current filters into the same URL param shape the GET uses.
      const filterBody: Record<string, string> = {}
      if (q) filterBody.q = q
      if (stage) filterBody.stage = stage
      if (filters.revMin !== null) filterBody.rev_min = String(filters.revMin)
      if (filters.revMax !== null) filterBody.rev_max = String(filters.revMax)
      if (filters.empMin !== null) filterBody.emp_min = String(filters.empMin)
      if (filters.empMax !== null) filterBody.emp_max = String(filters.empMax)
      if (filters.marMin !== null) filterBody.mar_min = String(filters.marMin)
      if (filters.marMax !== null) filterBody.mar_max = String(filters.marMax)
      if (filters.foundedFrom !== null) filterBody.founded_from = String(filters.foundedFrom)
      if (filters.foundedTo !== null) filterBody.founded_to = String(filters.foundedTo)
      if (filters.growthMin !== null) filterBody.growth_min = String(filters.growthMin)
      if (filters.growthMax !== null) filterBody.growth_max = String(filters.growthMax)
      if (filters.profitYearsMin !== null) filterBody.profit_min = String(filters.profitYearsMin)
      if (filters.debtMax !== null) filterBody.debt_max = String(filters.debtMax)
      if (filters.regions.length) filterBody.regions = filters.regions.join(',')
      if (filters.grades.length) filterBody.grades = filters.grades.join(',')
      if (filters.industry) filterBody.industry = filters.industry

      const res = await fetch('/api/bulk-update-stage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ filters: filterBody, toStage: 'watchlist' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      router.refresh()
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : 'Bulk update failed')
    } finally {
      setBulkMoving(false)
    }
  }

  const clearFilters = () => {
    updateParams({
      rev_min: null, rev_max: null, emp_min: null, emp_max: null,
      mar_min: null, mar_max: null, founded_from: null, founded_to: null,
      growth_min: null, growth_max: null, profit_min: null, debt_max: null,
      regions: null, grades: null, industry: null, page: '1',
    })
  }

  const toggleSort = (key: SortKey) => {
    const nextDir: 'asc' | 'desc' =
      sort === key ? (dir === 'asc' ? 'desc' : 'asc') : key === 'name' ? 'asc' : 'desc'
    updateParams({ sort: key, dir: nextDir, page: '1' })
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      onClick={() => toggleSort(field)}
      className="text-left text-xs font-medium text-slate-500 px-3 py-3 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
    >
      {label} {sort === field ? (dir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const fromRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const toRow = Math.min(page * pageSize, total)
  const activeFilterCount = countActiveFilters(filters)

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">All Companies</h1>
          <p className="text-xs text-slate-500">
            {total.toLocaleString()} total
            {(q || stage || activeFilterCount > 0) && ' (filtered)'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 border rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white rounded-full px-1.5 text-[10px] font-medium">
                {activeFilterCount}
              </span>
            )}
          </button>
          <select
            value={stage}
            onChange={(e) => updateParams({ stage: e.target.value || null, page: '1' })}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search name, industry, CEO, 법인번호…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={moveAllToWatchlist}
            disabled={bulkMoving || total === 0}
            className="px-3 py-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg text-sm hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="현재 필터 결과를 모두 Watchlist로 이동"
          >
            {bulkMoving ? '이동 중…' : `→ Watchlist (${total.toLocaleString()})`}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-3.5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            + Add
          </button>
        </div>
      </header>

      <NLSearchBar
        currentFilters={{ ...filters, q, stage }}
        onApply={applyNLFilters}
      />

      {bulkError && (
        <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <span>⚠ {bulkError}</span>
          <button onClick={() => setBulkError(null)} className="text-rose-400 hover:text-rose-600">×</button>
        </div>
      )}

      {showFilters && (
        <FiltersPanel
          value={filters}
          onChange={handleFilterChange}
          onClear={clearFilters}
        />
      )}

      <div className={`flex-1 overflow-auto ${isPending ? 'opacity-60' : ''}`}>
        <table className="w-full">
          <thead className="bg-slate-50 sticky top-0 z-[1]">
            <tr>
              <SortHeader label="Company" field="name" />
              <th className="text-left text-xs font-medium text-slate-500 px-3 py-3 whitespace-nowrap">
                Region
              </th>
              <SortHeader label="Stage" field="stage" />
              <SortHeader label="Revenue" field="revenue_krw" />
              <SortHeader label="YoY" field="revenue_growth_pct" />
              <SortHeader label="Margin" field="ebitda_pct" />
              <SortHeader label="Profit Yrs" field="positive_ops_years" />
              <SortHeader label="Debt %" field="debt_ratio_latest" />
              <SortHeader label="Employees" field="employees" />
              <SortHeader label="Founded" field="founded" />
              <th className="text-left text-xs font-medium text-slate-500 px-3 py-3 whitespace-nowrap">
                CF Grade
              </th>
            </tr>
          </thead>
          <tbody>
            {initialCompanies.map((c) => {
              const region = regionFromAddress(c.address)
              const subtitle = [c.industry, c.ceo_name || c.owner?.name].filter(Boolean).join(' · ')
              return (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-3">
                    <Link
                      href={`/company/${c.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-blue-600"
                    >
                      {c.name}
                    </Link>
                    {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                    {region ?? '-'}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        STAGE_COLORS[c.stage as Stage]
                      }`}
                    >
                      {STAGE_LABELS[c.stage as Stage]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">
                    {formatKRW(c.revenue_krw)}
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap">
                    {formatGrowth(c.revenue_growth_pct)}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">
                    {formatPct(c.ebitda_pct)}
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap">
                    {formatProfitYears(c.positive_ops_years)}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">
                    {c.debt_ratio_latest !== null ? `${c.debt_ratio_latest.toFixed(0)}%` : '-'}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">
                    {c.employees?.toLocaleString() || '-'}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">
                    {c.founded ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">
                    {c.cash_flow_grade ?? '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {initialCompanies.length === 0 && (
          <div className="text-center py-16 text-sm text-slate-400">
            {q || stage || activeFilterCount > 0 ? 'No matching companies' : 'No companies yet'}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white text-sm text-slate-600">
        <span>
          {fromRow.toLocaleString()}–{toRow.toLocaleString()} of {total.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateParams({ page: String(page - 1) })}
            disabled={page <= 1 || isPending}
            className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages.toLocaleString()}
          </span>
          <button
            onClick={() => updateParams({ page: String(page + 1) })}
            disabled={page >= totalPages || isPending}
            className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </footer>

      {showAdd && (
        <AddCompanyModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function formatGrowth(v: number | null | undefined): ReactNode {
  if (v === null || v === undefined) return <span className="text-slate-400">-</span>
  const color = v > 0 ? 'text-emerald-700' : v < 0 ? 'text-rose-700' : 'text-slate-600'
  const sign = v > 0 ? '+' : ''
  return <span className={color}>{sign}{v.toFixed(1)}%</span>
}

function formatProfitYears(v: number | null | undefined): ReactNode {
  if (v === null || v === undefined) return <span className="text-slate-400">-</span>
  const color = v === 3 ? 'text-emerald-700' : v === 0 ? 'text-rose-600' : 'text-slate-700'
  return <span className={color}>{v}/3</span>
}

function countActiveFilters(f: FilterState): number {
  return (
    (f.revMin !== null ? 1 : 0) +
    (f.revMax !== null ? 1 : 0) +
    (f.empMin !== null ? 1 : 0) +
    (f.empMax !== null ? 1 : 0) +
    (f.marMin !== null ? 1 : 0) +
    (f.marMax !== null ? 1 : 0) +
    (f.foundedFrom !== null ? 1 : 0) +
    (f.foundedTo !== null ? 1 : 0) +
    (f.growthMin !== null ? 1 : 0) +
    (f.growthMax !== null ? 1 : 0) +
    (f.profitYearsMin !== null ? 1 : 0) +
    (f.debtMax !== null ? 1 : 0) +
    (f.regions.length > 0 ? 1 : 0) +
    (f.grades.length > 0 ? 1 : 0) +
    (f.industry !== '' ? 1 : 0)
  )
}

function hasActiveFilters(f: FilterState): boolean {
  return countActiveFilters(f) > 0
}
