'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { AppUser, AppUserStatus, AppUserRole } from '@/lib/types'
import { setUserStatus, setUserRole } from './actions'

interface Props {
  users: AppUser[]
  watchlistCounts: Record<string, number>
  currentUserId: string
}

const STATUS_BADGE: Record<AppUserStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
}

export function AdminClient({ users, watchlistCounts, currentUserId }: Props) {
  const [filter, setFilter] = useState<AppUserStatus | 'all'>('all')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const pendingCount = users.filter((u) => u.status === 'pending').length

  const visible = filter === 'all'
    ? users
    : users.filter((u) => u.status === filter)
  // Pending users float to the top regardless of filter — they need attention.
  const sorted = [...visible].sort((a, b) => {
    const ap = a.status === 'pending' ? 0 : 1
    const bp = b.status === 'pending' ? 0 : 1
    if (ap !== bp) return ap - bp
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const run = (fn: () => Promise<void>) => {
    setError(null)
    startTransition(async () => {
      try { await fn() } catch (e) {
        setError(e instanceof Error ? e.message : 'Action failed')
      }
    })
  }

  const handleStatus = (id: string, s: AppUserStatus) => run(() => setUserStatus(id, s))
  const handleRole = (id: string, r: AppUserRole) => run(() => setUserRole(id, r))

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Admin · Users</h1>
          <p className="text-xs text-slate-500">
            {users.length} total
            {pendingCount > 0 && (
              <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                filter === f
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className={`flex-1 overflow-auto ${isPending ? 'opacity-60' : ''}`}>
        <table className="w-full">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th>Role</Th>
              <Th>Watchlist</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => {
              const isSelf = u.id === currentUserId
              return (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-3">
                    <Link href={`/users/${u.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600">
                      {u.email}
                    </Link>
                    {isSelf && <span className="ml-2 text-[10px] text-slate-400 uppercase">you</span>}
                    {u.display_name && (
                      <p className="text-xs text-slate-400">{u.display_name}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[u.status]}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600">
                    {watchlistCounts[u.id] ?? 0}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {u.status !== 'approved' && (
                        <ActionBtn onClick={() => handleStatus(u.id, 'approved')} tone="emerald">
                          Approve
                        </ActionBtn>
                      )}
                      {u.status !== 'rejected' && !isSelf && (
                        <ActionBtn onClick={() => handleStatus(u.id, 'rejected')} tone="rose">
                          Reject
                        </ActionBtn>
                      )}
                      {u.status === 'rejected' && (
                        <ActionBtn onClick={() => handleStatus(u.id, 'pending')} tone="slate">
                          Reset
                        </ActionBtn>
                      )}
                      {!isSelf && u.status === 'approved' && (
                        u.role === 'admin' ? (
                          <ActionBtn onClick={() => handleRole(u.id, 'member')} tone="slate">
                            Demote
                          </ActionBtn>
                        ) : (
                          <ActionBtn onClick={() => handleRole(u.id, 'admin')} tone="violet">
                            Make admin
                          </ActionBtn>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="text-center py-16 text-sm text-slate-400">No users in this filter</div>
        )}
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-xs font-medium text-slate-500 px-3 py-3 whitespace-nowrap">
      {children}
    </th>
  )
}

function ActionBtn({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode
  onClick: () => void
  tone: 'emerald' | 'rose' | 'violet' | 'slate'
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
    rose: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
    violet: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
    slate: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
  }
  return (
    <button onClick={onClick} className={`text-xs px-2 py-1 rounded-md border ${tones[tone]}`}>
      {children}
    </button>
  )
}
