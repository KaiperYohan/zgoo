'use client'

import Link from 'next/link'
import { Company, Owner } from '@/lib/types'
import { formatKRW, formatPct } from '@/lib/format'
import type { Watcher } from './KanbanBoard'

interface DealCardProps {
  company: Company & { owner?: Owner | null; watchers?: Watcher[] }
  dragging?: boolean
  onSendToPool?: (companyId: string) => void
}

export function DealCard({ company, dragging, onSendToPool }: DealCardProps) {
  const watchers = company.watchers ?? []
  return (
    <Link
      href={`/company/${company.id}`}
      draggable={false}
      className={`group block bg-white rounded-lg border border-slate-200 p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative ${
        dragging ? 'opacity-50 rotate-2 shadow-lg' : ''
      }`}
    >
      {onSendToPool && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSendToPool(company.id)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
          title="Pool로 돌려보내기"
        >
          ↩ Pool
        </button>
      )}
      <p className="text-sm font-semibold text-slate-900 truncate pr-12">{company.name}</p>
      {company.industry && (
        <p className="text-xs text-slate-400 mt-0.5">{company.industry}</p>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-xs">
        <div>
          <span className="text-slate-400">Revenue</span>
          <p className="text-slate-700 font-medium">{formatKRW(company.revenue_krw)}</p>
        </div>
        <div>
          <span className="text-slate-400">FCF</span>
          <p className="text-slate-700 font-medium">{formatKRW(company.fcf_krw)}</p>
        </div>
        <div>
          <span className="text-slate-400">EBITDA</span>
          <p className="text-slate-700 font-medium">{formatPct(company.ebitda_pct)}</p>
        </div>
        <div>
          <span className="text-slate-400">Owner</span>
          <p className="text-slate-700 font-medium">
            {company.owner ? `${company.owner.name}${company.owner.age ? ` (${company.owner.age})` : ''}` : '-'}
          </p>
        </div>
      </div>

      {watchers.length > 0 && (
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-1">Watched by</span>
          {watchers.slice(0, 3).map((w) => (
            <span
              key={w.user_id}
              title={w.email}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 max-w-[8rem] truncate"
            >
              {localPart(w.email)}
            </span>
          ))}
          {watchers.length > 3 && (
            <span
              title={watchers.slice(3).map((w) => w.email).join(', ')}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600"
            >
              +{watchers.length - 3}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}

function localPart(email: string): string {
  const at = email.indexOf('@')
  return at > 0 ? email.slice(0, at) : email
}
