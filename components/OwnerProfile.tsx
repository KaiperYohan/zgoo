'use client'

import { useState } from 'react'
import { Owner } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface OwnerProfileProps {
  companyId: string
  owner: Owner | null
  onUpdate: (owner: Owner) => void
}

export function OwnerProfile({ companyId, owner, onUpdate }: OwnerProfileProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: owner?.name || '',
    age: owner?.age?.toString() || '',
    phone: owner?.phone || '',
    email: owner?.email || '',
    background: owner?.background || '',
    relationship: owner?.relationship || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const payload = {
      company_id: companyId,
      name: form.name,
      age: form.age ? parseInt(form.age) : null,
      phone: form.phone || null,
      email: form.email || null,
      background: form.background || null,
      relationship: form.relationship || null,
    }

    let result
    if (owner) {
      result = await supabase.from('owners').update(payload).eq('id', owner.id).select().single()
    } else {
      result = await supabase.from('owners').insert(payload).select().single()
    }

    if (result.data) {
      onUpdate(result.data)
      setEditing(false)
    }
    setSaving(false)
  }

  if (!owner && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full py-6 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
      >
        + Add owner info
      </button>
    )
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Age</label>
            <input
              type="number"
              value={form.age}
              onChange={e => setForm({ ...form, age: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Background</label>
          <textarea
            value={form.background}
            onChange={e => setForm({ ...form, background: e.target.value })}
            rows={2}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Relationship Notes</label>
          <textarea
            value={form.relationship}
            onChange={e => setForm({ ...form, relationship: e.target.value })}
            rows={2}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.name}
            className="px-4 py-1.5 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-slate-400 text-xs">Name</span>
          <p className="text-slate-900 font-medium">{owner!.name}</p>
        </div>
        <div>
          <span className="text-slate-400 text-xs">Age</span>
          <p className="text-slate-900">{owner!.age || '-'}</p>
        </div>
        <div>
          <span className="text-slate-400 text-xs">Phone</span>
          <p className="text-slate-900">{owner!.phone || '-'}</p>
        </div>
        <div>
          <span className="text-slate-400 text-xs">Email</span>
          <p className="text-slate-900">{owner!.email || '-'}</p>
        </div>
      </div>
      {owner!.background && (
        <div className="mt-3 text-sm">
          <span className="text-slate-400 text-xs">Background</span>
          <p className="text-slate-700 whitespace-pre-wrap">{owner!.background}</p>
        </div>
      )}
      {owner!.relationship && (
        <div className="mt-2 text-sm">
          <span className="text-slate-400 text-xs">Relationship</span>
          <p className="text-slate-700 whitespace-pre-wrap">{owner!.relationship}</p>
        </div>
      )}
      <button
        onClick={() => setEditing(true)}
        className="mt-3 text-xs text-blue-600 hover:text-blue-700"
      >
        Edit owner
      </button>
    </div>
  )
}
