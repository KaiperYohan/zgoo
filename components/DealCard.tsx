'use client'

import Link from 'next/link'
import { Company, Owner } from '@/lib/types'
import { formatKRW, formatPct } from '@/lib/format'

interface DealCardProps {
  company: Company & { owner?: Owner | null }
  dragging?: boolean
  onSendToPool?: (companyId: string) => void
}

export function DealCard({ company, dragging, onSendToPool }: DealCardProps) {
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
    </Link>
  )
}
