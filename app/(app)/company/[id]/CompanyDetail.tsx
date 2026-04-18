'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Company, Owner, Activity, Note, Stage } from '@/lib/types'
import { formatKRW, formatPct } from '@/lib/format'
import { CF_GRADES } from '@/lib/filters'
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
  const [company, setCompany] = useState(initialCompany)
  const [owner, setOwner] = useState(initialOwner)

  // Header inline edit
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ name: company.name, industry: company.industry || '' })

  // Financials edit
  const [editingFinancials, setEditingFinancials] = useState(false)
  const [financialsForm, setFinancialsForm] = useState({
    revenue_krw: company.revenue_krw?.toString() || '',
    fcf_krw: company.fcf_krw?.toString() || '',
    ebitda_pct: company.ebitda_pct?.toString() || '',
    employees: company.employees?.toString() || '',
    founded: company.founded?.toString() || '',
  })

  // Info edit (KODATA fields + basic contact)
  const [editingInfo, setEditingInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({
    ceo_name: company.ceo_name ?? '',
    phone: company.phone ?? '',
    address: company.address ?? '',
    biz_reg_no: company.biz_reg_no ?? '',
    cash_flow_grade: company.cash_flow_grade ?? '',
    industry_code: company.industry_code ?? '',
    company_size: company.company_size ?? '',
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

  const handleHeaderSave = async () => {
    if (!headerForm.name.trim()) return
    const supabase = createClient()
    const { data } = await supabase
      .from('companies')
      .update({
        name: headerForm.name.trim(),
        industry: headerForm.industry.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', company.id)
      .select()
      .single()
    if (data) {
      setCompany(data)
      setEditingHeader(false)
    }
  }

  const handleFinancialsSave = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('companies')
      .update({
        revenue_krw: financialsForm.revenue_krw ? parseInt(financialsForm.revenue_krw) : null,
        fcf_krw: financialsForm.fcf_krw ? parseInt(financialsForm.fcf_krw) : null,
        ebitda_pct: financialsForm.ebitda_pct ? parseFloat(financialsForm.ebitda_pct) : null,
        employees: financialsForm.employees ? parseInt(financialsForm.employees) : null,
        founded: financialsForm.founded ? parseInt(financialsForm.founded) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', company.id)
      .select()
      .single()
    if (data) {
      setCompany(data)
      setEditingFinancials(false)
    }
  }

  const handleInfoSave = async () => {
    const supabase = createClient()
    const nullIfBlank = (s: string) => (s.trim() === '' ? null : s.trim())
    const { data } = await supabase
      .from('companies')
      .update({
        ceo_name: nullIfBlank(infoForm.ceo_name),
        phone: nullIfBlank(infoForm.phone),
        address: nullIfBlank(infoForm.address),
        biz_reg_no: nullIfBlank(infoForm.biz_reg_no),
        cash_flow_grade: nullIfBlank(infoForm.cash_flow_grade),
        industry_code: nullIfBlank(infoForm.industry_code),
        company_size: nullIfBlank(infoForm.company_size),
        updated_at: new Date().toISOString(),
      })
      .eq('id', company.id)
      .select()
      .single()
    if (data) {
      setCompany(data)
      setEditingInfo(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back */}
      <Link href="/pipeline" className="text-xs text-slate-400 hover:text-slate-600">
        ← Back to pipeline
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        {editingHeader ? (
          <div className="flex-1 space-y-2 mr-4">
            <input
              autoFocus
              value={headerForm.name}
              onChange={e => setHeaderForm({ ...headerForm, name: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') handleHeaderSave(); if (e.key === 'Escape') setEditingHeader(false) }}
              className="text-2xl font-bold text-slate-900 border-b-2 border-blue-500 outline-none bg-transparent w-full"
            />
            <input
              value={headerForm.industry}
              onChange={e => setHeaderForm({ ...headerForm, industry: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') handleHeaderSave(); if (e.key === 'Escape') setEditingHeader(false) }}
              placeholder="Industry"
              className="text-sm text-slate-500 border-b border-slate-300 outline-none bg-transparent w-full"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleHeaderSave}
                className="px-3 py-1 bg-slate-900 text-white text-xs rounded-md hover:bg-slate-800"
              >
                Save
              </button>
              <button
                onClick={() => { setEditingHeader(false); setHeaderForm({ name: company.name, industry: company.industry || '' }) }}
                className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="group flex items-start gap-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
              {company.industry && <p className="text-sm text-slate-500 mt-0.5">{company.industry}</p>}
            </div>
            <button
              onClick={() => setEditingHeader(true)}
              className="mt-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit name"
            >
              <PencilIcon />
            </button>
          </div>
        )}

      </div>

      {/* Stage progress */}
      <StageProgress currentStage={company.stage} onStageChange={handleStageChange} />

      {/* Financials */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Financials</h3>
          {editingFinancials ? (
            <div className="flex gap-2">
              <button
                onClick={handleFinancialsSave}
                className="text-xs px-3 py-1 bg-slate-900 text-white rounded-md hover:bg-slate-800"
              >
                Save
              </button>
              <button
                onClick={() => setEditingFinancials(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingFinancials(true)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Edit
            </button>
          )}
        </div>

        {editingFinancials ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Revenue (KRW)', key: 'revenue_krw' },
              { label: 'FCF (KRW)', key: 'fcf_krw' },
              { label: 'EBITDA %', key: 'ebitda_pct' },
              { label: 'Employees', key: 'employees' },
              { label: 'Founded', key: 'founded' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs text-slate-500 mb-1">{label}</label>
                <input
                  type="number"
                  value={financialsForm[key as keyof typeof financialsForm]}
                  onChange={e => setFinancialsForm({ ...financialsForm, [key]: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
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

      {/* Company Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Company Info</h3>
          {editingInfo ? (
            <div className="flex gap-2">
              <button
                onClick={handleInfoSave}
                className="text-xs px-3 py-1 bg-slate-900 text-white rounded-md hover:bg-slate-800"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingInfo(false)
                  setInfoForm({
                    ceo_name: company.ceo_name ?? '',
                    phone: company.phone ?? '',
                    address: company.address ?? '',
                    biz_reg_no: company.biz_reg_no ?? '',
                    cash_flow_grade: company.cash_flow_grade ?? '',
                    industry_code: company.industry_code ?? '',
                    company_size: company.company_size ?? '',
                  })
                }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingInfo(true)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Edit
            </button>
          )}
        </div>

        {editingInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoInput
              label="대표자 (CEO)"
              value={infoForm.ceo_name}
              onChange={(v) => setInfoForm({ ...infoForm, ceo_name: v })}
            />
            <InfoInput
              label="전화번호"
              value={infoForm.phone}
              onChange={(v) => setInfoForm({ ...infoForm, phone: v })}
            />
            <div className="md:col-span-2">
              <InfoInput
                label="주소"
                value={infoForm.address}
                onChange={(v) => setInfoForm({ ...infoForm, address: v })}
              />
            </div>
            <InfoInput
              label="사업자번호"
              value={infoForm.biz_reg_no}
              onChange={(v) => setInfoForm({ ...infoForm, biz_reg_no: v })}
            />
            <div>
              <label className="block text-xs text-slate-500 mb-1">현금흐름등급</label>
              <select
                value={infoForm.cash_flow_grade}
                onChange={(e) => setInfoForm({ ...infoForm, cash_flow_grade: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                {CF_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <InfoInput
              label="업종코드"
              value={infoForm.industry_code}
              onChange={(v) => setInfoForm({ ...infoForm, industry_code: v })}
            />
            <InfoInput
              label="기업규모"
              value={infoForm.company_size}
              onChange={(v) => setInfoForm({ ...infoForm, company_size: v })}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <InfoRow label="대표자" value={company.ceo_name} />
            <InfoRow label="전화번호" value={company.phone} />
            <div className="md:col-span-2">
              <InfoRow label="주소" value={company.address} />
            </div>
            <InfoRow label="법인번호" value={company.corp_reg_no} muted />
            <InfoRow label="사업자번호" value={company.biz_reg_no} />
            <InfoRow label="현금흐름등급" value={company.cash_flow_grade} />
            <InfoRow label="업종코드" value={company.industry_code} />
            <InfoRow label="기업규모" value={company.company_size} />
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

function InfoRow({ label, value, muted }: { label: string; value: string | null | undefined; muted?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs text-slate-400 w-24 shrink-0 pt-0.5">{label}</span>
      <span className={muted ? 'text-slate-400' : 'text-slate-700'}>{value || '-'}</span>
    </div>
  )
}

function InfoInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}
