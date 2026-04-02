'use client'

import { useState } from 'react'
import { Activity, ActivityType } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const TYPE_ICONS: Record<ActivityType, string> = {
  email: '✉',
  call: '📞',
  meeting: '🤝',
  note: '📝',
}

interface ActivityLogProps {
  companyId: string
  initialActivities: Activity[]
}

export function ActivityLog({ companyId, initialActivities }: ActivityLogProps) {
  const [activities, setActivities] = useState(initialActivities)
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<ActivityType>('note')
  const [body, setBody] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16))
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('activities')
      .insert({
        company_id: companyId,
        type,
        body: body.trim(),
        occurred_at: new Date(date).toISOString(),
      })
      .select()
      .single()

    if (data && !error) {
      setActivities([data, ...activities])
      setBody('')
      setShowForm(false)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('activities').delete().eq('id', id)
    setActivities(activities.filter(a => a.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Activity Log</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-3 bg-slate-50 rounded-lg space-y-2.5">
          <div className="flex gap-2">
            {(['email', 'call', 'meeting', 'note'] as ActivityType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  type === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {TYPE_ICONS[t]} {t}
              </button>
            ))}
          </div>
          <input
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="What happened?"
            rows={3}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={saving || !body.trim()}
            className="px-4 py-1.5 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Log activity'}
          </button>
        </form>
      )}

      {activities.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">No activities yet</p>
      ) : (
        <div className="space-y-0">
          {activities.map(a => (
            <div key={a.id} className="group flex gap-3 py-2.5 border-b border-slate-100 last:border-0">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs shrink-0 mt-0.5">
                {a.type ? TYPE_ICONS[a.type as ActivityType] || '•' : '•'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.body}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(a.occurred_at).toLocaleDateString('ko-KR')} {new Date(a.occurred_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  {a.type && <span className="ml-2 capitalize">{a.type}</span>}
                </p>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-xs text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
