'use client'

import { useState } from 'react'
import { NoteWithAuthor } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface CompanyNotesProps {
  companyId: string
  initialNotes: NoteWithAuthor[]
  currentUserId: string
  currentUserEmail: string
}

export function CompanyNotes({
  companyId,
  initialNotes,
  currentUserId,
  currentUserEmail,
}: CompanyNotesProps) {
  const [notes, setNotes] = useState<NoteWithAuthor[]>(initialNotes)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePost = async () => {
    const body = draft.trim()
    if (!body) return
    setPosting(true)
    setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('notes')
      .insert({ company_id: companyId, user_id: currentUserId, body })
      .select()
      .single()
    if (err || !data) {
      setError(err?.message ?? 'Failed to post')
      setPosting(false)
      return
    }
    setNotes([{ ...data, author_email: currentUserEmail }, ...notes])
    setDraft('')
    setPosting(false)
  }

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('Delete this comment?')) return
    const supabase = createClient()
    const { error: err } = await supabase.from('notes').delete().eq('id', noteId)
    if (err) {
      setError(err.message)
      return
    }
    setNotes(notes.filter((n) => n.id !== noteId))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Comments
          {notes.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">({notes.length})</span>
          )}
        </h3>
      </div>

      <div className="space-y-2 mb-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handlePost()
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">⌘/Ctrl + Enter to post</span>
          <button
            onClick={handlePost}
            disabled={!draft.trim() || posting}
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>

      {notes.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-medium text-slate-700">
                  {n.author_email ?? <span className="italic text-slate-400">(legacy)</span>}
                </span>
                <span className="text-[10px] text-slate-400">{formatTime(n.created_at)}</span>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{n.body}</p>
              {n.user_id === currentUserId && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-[11px] text-slate-400 hover:text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return d.toLocaleDateString()
}
