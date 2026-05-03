'use client'

import Link from 'next/link'
import {
  AppUser,
  Company,
  Stage,
  STAGE_COLORS,
  STAGE_LABELS,
  PIPELINE_STAGES,
} from '@/lib/types'
import { formatKRW } from '@/lib/format'
import { WatchlistButton } from '@/components/WatchlistButton'

type WatchedCompany = Company & { addedAt: string | null }

interface Props {
  profile: AppUser
  companies: WatchedCompany[]
  isSelf: boolean
}

export function UserPageClient({ profile, companies, isSelf }: Props) {
  const grouped = new Map<Stage, WatchedCompany[]>()
  for (const s of PIPELINE_STAGES) grouped.set(s, [])
  for (const c of companies) {
    const stage = c.stage as Stage
    // Companies dropped back to 'pool' (e.g., a watchlisted company that was
    // never promoted) still show, but under the 'watchlist' bucket so the user
    // sees something. Pipeline stages we know about land in their own column.
    const bucket = PIPELINE_STAGES.includes(stage) ? stage : 'watchlist'
    grouped.get(bucket)!.push(c)
  }

  const total = companies.length

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {isSelf ? 'My page' : profile.email}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isSelf ? profile.email : 'User watchlist'} ·{' '}
              <span className={`inline-block px-1.5 py-0.5 rounded ${
                profile.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
              }`}>{profile.role}</span>{' '}
              · joined {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Watchlist</p>
            <p className="text-2xl font-semibold text-slate-900">{total}</p>
          </div>
        </div>
      </header>

      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-slate-500">
              {isSelf ? 'No companies on your watchlist yet.' : 'This user has no watchlisted companies.'}
            </p>
            {isSelf && (
              <Link
                href="/companies"
                className="inline-block mt-3 px-3.5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Browse companies
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          <p className="text-xs text-slate-500 mb-3">
            {isSelf
              ? 'Your watchlisted companies, grouped by their current pipeline stage. Stages update as the team moves them on the kanban.'
              : `${profile.email}'s watchlisted companies, grouped by their current pipeline stage.`}
          </p>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, minmax(200px, 1fr))` }}>
            {PIPELINE_STAGES.map((stage) => {
              const items = grouped.get(stage) ?? []
              return (
                <div key={stage} className="bg-white rounded-lg border border-slate-200 flex flex-col">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
                      {STAGE_LABELS[stage]}
                    </span>
                    <span className="text-xs text-slate-400">{items.length}</span>
                  </div>
                  <div className="p-2 space-y-2 min-h-[80px]">
                    {items.map((c) => (
                      <div
                        key={c.id}
                        className="bg-slate-50 hover:bg-slate-100 rounded-md p-2.5 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/company/${c.id}`}
                            className="text-sm font-medium text-slate-900 hover:text-blue-600 leading-tight"
                          >
                            {c.name}
                          </Link>
                          {isSelf && (
                            <WatchlistButton
                              companyId={c.id}
                              initialWatched={true}
                              variant="icon"
                            />
                          )}
                        </div>
                        {c.industry && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{c.industry}</p>
                        )}
                        {c.revenue_krw !== null && (
                          <p className="text-[11px] text-slate-400 mt-1">{formatKRW(c.revenue_krw)}</p>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-[11px] text-slate-300 text-center py-4">—</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
