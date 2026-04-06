'use client'

import { useState } from 'react'
import { Company, Stage, STAGES, STAGE_LABELS } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onClose: () => void
  onAdded: (company: Company) => void
  initialStage?: Stage
}

export function AddCompanyModal({ onClose, onAdded, initialStage = 'watchlist' }: Props) {
  const [form, setForm] = useState({
    name: '',
    industry: '',
    revenue_krw: '',
    fcf_krw: '',
    ebitda_pct: '',
    employees: '',
    founded: '',
    stage: initialStage,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('companies')
      .insert({
        name: form.name.trim(),
        industry: form.industry || null,
        revenue_krw: form.revenue_krw ? parseInt(form.revenue_krw) : null,
        fcf_krw: form.fcf_krw ? parseInt(form.fcf_krw) : null,
        ebitda_pct: form.ebitda_pct ? parseFloat(form.ebitda_pct) : null,
        employees: form.employees ? parseInt(form.employees) : null,
        founded: form.founded ? parseInt(form.founded) : null,
        stage: form.stage,
      })
      .select()
      .single()

    if (data && !error) {
      onAdded(data)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Company</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Company Name *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Industry</label>
              <input
                value={form.industry}
                onChange={e => setForm({ ...form, industry: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Stage</label>
              <select
                value={form.stage}
                onChange={e => setForm({ ...form, stage: e.target.value as Stage })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STAGES.map(s => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Revenue (KRW)</label>
              <input
                type="number"
                value={form.revenue_krw}
                onChange={e => setForm({ ...form, revenue_krw: e.target.value })}
                placeholder="e.g. 5000000000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">FCF (KRW)</label>
              <input
                type="number"
                value={form.fcf_krw}
                onChange={e => setForm({ ...form, fcf_krw: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">EBITDA %</label>
              <input
                type="number"
                step="0.01"
                value={form.ebitda_pct}
                onChange={e => setForm({ ...form, ebitda_pct: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Employees</label>
              <input
                type="number"
                value={form.employees}
                onChange={e => setForm({ ...form, employees: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Founded</label>
              <input
                type="number"
                value={form.founded}
                onChange={e => setForm({ ...form, founded: e.target.value })}
                placeholder="e.g. 2005"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
