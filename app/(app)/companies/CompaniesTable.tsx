'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Company, Owner, STAGE_LABELS, STAGE_COLORS, Stage } from '@/lib/types'
import { formatKRW, formatPct } from '@/lib/format'
import { AddCompanyModal } from '@/components/AddCompanyModal'

type CompanyWithOwner = Company & { owner?: Owner | null }
type SortKey = 'name' | 'revenue_krw' | 'fcf_krw' | 'ebitda_pct' | 'employees' | 'stage' | 'created_at'

export function CompaniesTable({ initialCompanies }: { initialCompanies: CompanyWithOwner[] }) {
  const searchParams = useSearchParams()
  const [companies, setCompanies] = useState(initialCompanies)
  const [showAdd, setShowAdd] = useState(searchParams.get('new') === '1')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [search, setSearch] = useState('')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(key === 'name')
    }
  }

  const filtered = companies
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortAsc ? cmp : -cmp
    })

  const handleAdded = (company: Company) => {
    setCompanies([{ ...company, owner: null }, ...companies])
    setShowAdd(false)
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      onClick={() => toggleSort(field)}
      className="text-left text-xs font-medium text-slate-500 px-4 py-3 cursor-pointer hover:text-slate-700 select-none"
    >
      {label} {sortKey === field ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">All Companies</h1>
          <p className="text-xs text-slate-500">{companies.length} total</p>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowAdd(true)}
            className="px-3.5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            + Add company
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <SortHeader label="Company" field="name" />
              <SortHeader label="Stage" field="stage" />
              <SortHeader label="Revenue" field="revenue_krw" />
              <SortHeader label="FCF" field="fcf_krw" />
              <SortHeader label="EBITDA" field="ebitda_pct" />
              <SortHeader label="Employees" field="employees" />
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Owner</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <Link href={`/company/${c.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600">
                    {c.name}
                  </Link>
                  {c.industry && <p className="text-xs text-slate-400">{c.industry}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[c.stage as Stage]}`}>
                    {STAGE_LABELS[c.stage as Stage]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{formatKRW(c.revenue_krw)}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{formatKRW(c.fcf_krw)}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{formatPct(c.ebitda_pct)}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{c.employees?.toLocaleString() || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {c.owner ? `${c.owner.name}${c.owner.age ? ` (${c.owner.age})` : ''}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-slate-400">
            {search ? 'No matching companies' : 'No companies yet'}
          </div>
        )}
      </div>

      {showAdd && <AddCompanyModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
    </div>
  )
}
