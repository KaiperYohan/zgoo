'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  companyId: string
  initialWatched: boolean
  variant?: 'icon' | 'pill'
}

export function WatchlistButton({ companyId, initialWatched, variant = 'pill' }: Props) {
  const router = useRouter()
  const [watched, setWatched] = useState(initialWatched)
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    const next = !watched
    setWatched(next)
    try {
      const res = next
        ? await fetch('/api/watchlist', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ companyId }),
          })
        : await fetch(`/api/watchlist?companyId=${encodeURIComponent(companyId)}`, {
            method: 'DELETE',
          })
      if (!res.ok) {
        setWatched(!next)
      } else {
        startTransition(() => router.refresh())
      }
    } catch {
      setWatched(!next)
    } finally {
      setBusy(false)
    }
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={toggle}
        disabled={busy || isPending}
        title={watched ? 'Remove from my watchlist' : 'Add to my watchlist'}
        className={`p-1 rounded hover:bg-slate-100 transition-colors ${
          watched ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'
        }`}
      >
        <StarIcon filled={watched} />
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={busy || isPending}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
        watched
          ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
      } disabled:opacity-50`}
    >
      <StarIcon filled={watched} />
      {watched ? 'On my watchlist' : 'Add to my watchlist'}
    </button>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="w-4 h-4"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  )
}
