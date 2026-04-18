'use client'

import { useState } from 'react'
import { FilterState } from './FiltersPanel'

export type ParsedFilters = Partial<FilterState> & {
  q?: string
  stage?: string
  explanation?: string
  [key: string]: unknown
}

interface HistoryEntry {
  query: string
  explanation: string | null
  error?: string
  ts: number
}

interface Props {
  currentFilters: FilterState & { q: string; stage: string }
  onApply: (filters: ParsedFilters) => void
}

export function NLSearchBar({ currentFilters, onApply }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const submit = async () => {
    const q = query.trim()
    if (!q || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/nl-search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: q, currentFilters }),
      })
      if (!res.ok) {
        const bodyJson = await res.json().catch(() => ({}))
        throw new Error(bodyJson.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { filters: ParsedFilters }
      const explanation =
        typeof data.filters.explanation === 'string' ? data.filters.explanation : null
      setHistory((h) => [{ query: q, explanation, ts: Date.now() }, ...h].slice(0, 10))
      onApply(data.filters)
      setQuery('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      setHistory((h) => [{ query: q, explanation: null, error: msg, ts: Date.now() }, ...h].slice(0, 10))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-6 py-3 border-b border-slate-200 bg-gradient-to-b from-blue-50/40 to-white">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-600 shrink-0">🤖 AI 검색</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={
            history.length === 0
              ? '예) "수도권 제조업, 50-500억 매출, 3년 연속 흑자"'
              : '이어서 검색: 예) "부채비율도 100% 이하로"'
          }
          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          disabled={loading}
        />
        <button
          onClick={submit}
          disabled={loading || !query.trim()}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? '…' : '검색'}
        </button>
        {history.length > 0 && (
          <button
            onClick={() => setHistory([])}
            className="text-xs text-slate-400 hover:text-slate-600 shrink-0"
            title="Clear history"
          >
            기록 지우기
          </button>
        )}
      </div>
      {history.length > 0 && (
        <div className="mt-2 space-y-1">
          {history.map((h) => (
            <div key={h.ts} className="flex gap-2 text-xs">
              <span className="text-slate-400 shrink-0">›</span>
              <div className="flex-1">
                <div className="text-slate-700">{h.query}</div>
                {h.error ? (
                  <div className="text-rose-600">⚠ {h.error}</div>
                ) : h.explanation ? (
                  <div className="text-slate-500">💬 {h.explanation}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
