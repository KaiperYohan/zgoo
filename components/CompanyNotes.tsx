'use client'

import { useState, useEffect, useRef } from 'react'
import { Note } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface CompanyNotesProps {
  companyId: string
  initialNote: Note | null
}

export function CompanyNotes({ companyId, initialNote }: CompanyNotesProps) {
  const [note, setNote] = useState(initialNote)
  const [body, setBody] = useState(initialNote?.body || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const timer = useRef<number | null>(null)

  // Auto-save on change with debounce
  useEffect(() => {
    if (body === (note?.body || '')) return
    setSaved(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = window.setTimeout(() => save(), 1000)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [body])

  const save = async () => {
    setSaving(true)
    const supabase = createClient()

    if (note) {
      const { data } = await supabase
        .from('notes')
        .update({ body, updated_at: new Date().toISOString() })
        .eq('id', note.id)
        .select()
        .single()
      if (data) setNote(data)
    } else if (body.trim()) {
      const { data } = await supabase
        .from('notes')
        .insert({ company_id: companyId, body })
        .select()
        .single()
      if (data) setNote(data)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
        <span className="text-xs text-slate-400">
          {saving ? 'Saving...' : saved ? 'Saved' : ''}
        </span>
      </div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Freeform notes about this company..."
        rows={6}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
      />
    </div>
  )
}
