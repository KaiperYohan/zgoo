'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { summarizeQuery } from '@/lib/summarizeQuery'
import { formatKstRelative } from '@/lib/format'

interface Entry {
  query: string
  last_used_at: string
}

export function SearchHistory({ onApply }: { onApply: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close when the user clicks outside the dropdown.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/search-history')
      const json = await res.json()
      setEntries(json.entries ?? [])
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    if (!open) load()
    setOpen(!open)
  }

  const handleApply = (query: string) => {
    setOpen(false)
    router.push(`/companies?${query}`)
    onApply()
  }

  const handleDelete = async (query: string) => {
    setEntries((prev) => prev?.filter((e) => e.query !== query) ?? prev)
    await fetch(`/api/search-history?query=${encodeURIComponent(query)}`, {
      method: 'DELETE',
    })
  }

  const handleClearAll = async () => {
    if (!window.confirm('Delete all search history?')) return
    setEntries([])
    await fetch('/api/search-history', { method: 'DELETE' })
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={handleToggle}
        className={`px-3 py-1.5 border rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
          open
            ? 'bg-slate-900 text-white border-slate-900'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
        title="Recent searches"
      >
        <ClockIcon /> History
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-96 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-[28rem] overflow-auto">
          {loading && (
            <p className="text-xs text-slate-400 text-center py-6">Loading…</p>
          )}
          {!loading && entries !== null && entries.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No saved searches yet.</p>
          )}
          {!loading && entries !== null && entries.length > 0 && (
            <>
              <ul>
                {entries.map((e) => (
                  <li
                    key={e.query}
                    className="border-b border-slate-100 last:border-b-0 group hover:bg-slate-50"
                  >
                    <div className="flex items-stretch">
                      <button
                        onClick={() => handleApply(e.query)}
                        className="flex-1 text-left px-3 py-2 min-w-0"
                      >
                        <p className="text-sm text-slate-700 truncate">
                          {summarizeQuery(e.query)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatKstRelative(e.last_used_at)}
                        </p>
                      </button>
                      <button
                        onClick={() => handleDelete(e.query)}
                        className="px-2 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100"
                        title="Delete this entry"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleClearAll}
                className="w-full text-center py-2 text-xs text-slate-500 hover:text-rose-600 border-t border-slate-100"
              >
                Clear all history
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
