'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Company, Owner, Activity, Note, Stage } from '@/lib/types'
import { formatKRW, formatPct } from '@/lib/format'
import { StageProgress } from '@/components/StageProgress'
import { OwnerProfile } from '@/components/OwnerProfile'
import { ActivityLog } from '@/components/ActivityLog'
import { CompanyNotes } from '@/components/CompanyNotes'
import { createClient } from '@/lib/supabase/client'

interface Props {
  company: Company
  owner: Owner | null
  activities: Activity[]
  note: Note | null
}

export function CompanyDetail({ company: initialCompany, owner: initialOwner, activities, note }: Props) {
  const router = useRouter()
  const [company, setCompany] = useState(initialCompany)
  const [owner, setOwner] = useState(initialOwner)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: company.name,
    industry: company.industry || '',
    revenue_krw: company.revenue_krw?.toString() || '',
    fcf_krw: company.fcf_krw?.toString() || '',
    ebitda_pct: company.ebitda_pct?.toString() || '',
    employees: company.employees?.toString() || '',
    founded: company.founded?.toString() || '',
  })

  const handleStageChange = async (stage: Stage) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('companies')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', company.id)
      .select()
      .single()
    if (data) setCompany(data)
  }

  const handleSave = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('companies')
      .update({
        name: form.name,
        industry: form.industry || null,
        revenue_krw: form.revenue_krw ? parseInt(form.revenue_krw) : null,
        fcf_krw: form.fcf_krw ? parseInt(form.fcf_krw) : null,
        ebitda_pct: form.ebitda_pct ? parseFloat(form.ebitda_pct) : null,
        employees: form.employees ? parseInt(form.employees) : null,
        founded: form.founded ? parseInt(form.founded) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', company.id)
      .select()
      .single()
    if (data) {
      setCompany(data)
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this company and all related data?')) return
    const supabase = createClient()
    await supabase.from('companies').delete().eq('id', company.id)
    router.push('/pipeline')
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/pipeline" className="text-xs text-slate-400 hover:text-slate-600">
          ← Back to pipeline
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            {company.industry && <p className="text-sm text-slate-500 mt-0.5">{company.industry}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs border border-red-200 rounded-md hover:bg-red-50 text-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Stage progress */}
      <StageProgress currentStage={company.stage} onStageChange={handleStageChange} />

      {/* Financials */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Financials</h3>
        {editing ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Company Name', key: 'name', type: 'text' },
              { label: 'Industry', key: 'industry', type: 'text' },
              { label: 'Revenue (KRW)', key: 'revenue_krw', type: 'number' },
              { label: 'FCF (KRW)', key: 'fcf_krw', type: 'number' },
              { label: 'EBITDA %', key: 'ebitda_pct', type: 'number' },
              { label: 'Employees', key: 'employees', type: 'number' },
              { label: 'Founded', key: 'founded', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs text-slate-500 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="col-span-full">
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-800"
              >
                Save changes
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Revenue" value={formatKRW(company.revenue_krw)} />
            <Stat label="FCF" value={formatKRW(company.fcf_krw)} />
            <Stat label="EBITDA" value={formatPct(company.ebitda_pct)} />
            <Stat label="Employees" value={company.employees?.toLocaleString() || '-'} />
            <Stat label="Founded" value={company.founded?.toString() || '-'} />
          </div>
        )}
      </div>

      {/* Two column: Owner + Notes */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Owner</h3>
          <OwnerProfile companyId={company.id} owner={owner} onUpdate={setOwner} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <CompanyNotes companyId={company.id} initialNote={note} />
        </div>
      </div>

      {/* Activity log */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <ActivityLog companyId={company.id} initialActivities={activities} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-slate-400">{label}</span>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}
