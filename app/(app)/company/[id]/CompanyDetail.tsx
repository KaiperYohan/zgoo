'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Company,
  Owner,
  Activity,
  NoteWithAuthor,
  Stage,
  CompanyFinancials,
  TradePartner,
  RelatedCompany,
  Executive,
} from '@/lib/types'
import { formatKRW, formatPct } from '@/lib/format'
import { CF_GRADES } from '@/lib/filters'
import { StageProgress } from '@/components/StageProgress'
import { OwnerProfile } from '@/components/OwnerProfile'
import { ActivityLog } from '@/components/ActivityLog'
import { CompanyNotes } from '@/components/CompanyNotes'
import { WatchlistButton } from '@/components/WatchlistButton'
import { RequestFieldButton } from '@/components/RequestFieldButton'
import { FieldKey } from '@/lib/fieldRequests'
import { createClient } from '@/lib/supabase/client'

type RelatedCompanyWithLink = RelatedCompany & { linked_company_id: string | null }

interface Props {
  company: Company
  owner: Owner | null
  shareholders: Owner[]
  financials: CompanyFinancials[]
  tradePartners: TradePartner[]
  relatedCompanies: RelatedCompanyWithLink[]
  executives: Executive[]
  activities: Activity[]
  notes: NoteWithAuthor[]
  currentUserId: string
  currentUserEmail: string
  initialWatched: boolean
  pendingFields: string[]
  pendingOwnerFields: string[]
}

export function CompanyDetail({
  company: initialCompany,
  owner: initialOwner,
  shareholders,
  financials,
  tradePartners,
  relatedCompanies,
  executives,
  activities,
  notes,
  currentUserId,
  currentUserEmail,
  initialWatched,
  pendingFields,
  pendingOwnerFields,
}: Props) {
  const pendingSet = new Set(pendingFields)
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
    email: company.email ?? '',
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
        email: nullIfBlank(infoForm.email),
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
              {company.industry ? (
                <p className="text-sm text-slate-500 mt-0.5">{company.industry}</p>
              ) : (
                <div className="mt-1">
                  <RequestFieldButton
                    companyId={company.id}
                    fieldKey="industry"
                    initialPending={pendingSet.has('industry')}
                  />
                </div>
              )}
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

        <WatchlistButton companyId={company.id} initialWatched={initialWatched} />
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
            <FinStat
              label="Revenue"
              hasValue={company.revenue_krw !== null}
              displayValue={formatKRW(company.revenue_krw)}
              fieldKey="revenue_krw"
              companyId={company.id}
              pendingSet={pendingSet}
            />
            <FinStat
              label="FCF"
              hasValue={company.fcf_krw !== null}
              displayValue={formatKRW(company.fcf_krw)}
              fieldKey="fcf_krw"
              companyId={company.id}
              pendingSet={pendingSet}
            />
            <FinStat
              label="EBITDA"
              hasValue={company.ebitda_pct !== null}
              displayValue={formatPct(company.ebitda_pct)}
              fieldKey="ebitda_pct"
              companyId={company.id}
              pendingSet={pendingSet}
            />
            <FinStat
              label="Employees"
              hasValue={company.employees !== null}
              displayValue={company.employees?.toLocaleString() ?? ''}
              fieldKey="employees"
              companyId={company.id}
              pendingSet={pendingSet}
            />
            <FinStat
              label="Founded"
              hasValue={company.founded !== null}
              displayValue={company.founded?.toString() ?? ''}
              fieldKey="founded"
              companyId={company.id}
              pendingSet={pendingSet}
            />
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
                    email: company.email ?? '',
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
            <InfoInput
              label="이메일"
              value={infoForm.email}
              onChange={(v) => setInfoForm({ ...infoForm, email: v })}
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
            <InfoRow label="대표자" value={company.ceo_name} fieldKey="ceo_name" companyId={company.id} pendingSet={pendingSet} />
            <InfoRow label="전화번호" value={company.phone} fieldKey="phone" companyId={company.id} pendingSet={pendingSet} />
            <InfoRow label="이메일" value={company.email} fieldKey="email" companyId={company.id} pendingSet={pendingSet} />
            <div className="md:col-span-2">
              <InfoRow label="주소" value={company.address} fieldKey="address" companyId={company.id} pendingSet={pendingSet} />
            </div>
            <InfoRow label="법인번호" value={company.corp_reg_no} muted />
            <InfoRow label="사업자번호" value={company.biz_reg_no} fieldKey="biz_reg_no" companyId={company.id} pendingSet={pendingSet} />
            <InfoRow label="현금흐름등급" value={company.cash_flow_grade} fieldKey="cash_flow_grade" companyId={company.id} pendingSet={pendingSet} />
            <InfoRow label="업종코드" value={company.industry_code} fieldKey="industry_code" companyId={company.id} pendingSet={pendingSet} />
            <InfoRow label="기업규모" value={company.company_size} fieldKey="company_size" companyId={company.id} pendingSet={pendingSet} />
          </div>
        )}
      </div>

      {/* Cash Flow Statement (현금흐름표) */}
      <CashFlowSection financials={financials} />

      {/* Shareholders / Equity Structure (주주정보 / 지분구조) */}
      <ShareholdersSection
        shareholders={shareholders}
        shareholderCount={company.shareholder_count}
      />

      {/* Executives (임원현황) */}
      <ExecutivesSection executives={executives} executivesRaw={company.executives_raw} />

      {/* Suppliers & Customers (공급처 / 판매처) */}
      <TradePartnersSection partners={tradePartners} />

      {/* Related Companies (관계사 지도) */}
      <RelatedCompaniesSection items={relatedCompanies} />

      {/* Two column: Owner + Notes */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Owner</h3>
          <OwnerProfile
            companyId={company.id}
            owner={owner}
            onUpdate={setOwner}
            pendingOwnerFields={pendingOwnerFields}
          />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <CompanyNotes
            companyId={company.id}
            initialNotes={notes}
            currentUserId={currentUserId}
            currentUserEmail={currentUserEmail}
          />
        </div>
      </div>

      {/* Activity log */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <ActivityLog companyId={company.id} initialActivities={activities} />
      </div>
    </div>
  )
}

function FinStat({
  label,
  hasValue,
  displayValue,
  fieldKey,
  companyId,
  pendingSet,
}: {
  label: string
  hasValue: boolean
  displayValue: string
  fieldKey: FieldKey
  companyId: string
  pendingSet: Set<string>
}) {
  return (
    <div>
      <span className="text-xs text-slate-400">{label}</span>
      {hasValue ? (
        <p className="text-lg font-semibold text-slate-900">{displayValue}</p>
      ) : (
        <div className="mt-1">
          <RequestFieldButton
            companyId={companyId}
            fieldKey={fieldKey}
            initialPending={pendingSet.has(fieldKey)}
          />
        </div>
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  muted,
  fieldKey,
  companyId,
  pendingSet,
}: {
  label: string
  value: string | null | undefined
  muted?: boolean
  fieldKey?: FieldKey
  companyId?: string
  pendingSet?: Set<string>
}) {
  const hasValue = value !== null && value !== undefined && value !== ''
  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs text-slate-400 w-24 shrink-0">{label}</span>
      {hasValue ? (
        <span className={muted ? 'text-slate-400' : 'text-slate-700'}>{value}</span>
      ) : fieldKey && companyId && pendingSet ? (
        <RequestFieldButton
          companyId={companyId}
          fieldKey={fieldKey}
          initialPending={pendingSet.has(fieldKey)}
        />
      ) : (
        <span className="text-slate-400">-</span>
      )}
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

// KODATA financials are stored in 천원. formatKRW expects 원 — multiply by 1000.
function fmtThousand(v: number | null | undefined): string {
  if (v === null || v === undefined) return '-'
  return formatKRW(v * 1000)
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>
}

function CashFlowSection({ financials }: { financials: CompanyFinancials[] }) {
  // Show only the 3 standard fiscal years, in descending order (2025 → 2023).
  const years = [2025, 2024, 2023]
  const byYear = new Map(financials.map((f) => [f.fiscal_year, f]))
  const rows: { label: string; key: keyof CompanyFinancials }[] = [
    { label: '영업활동현금흐름', key: 'operating_cash_flow' },
    { label: '투자활동현금흐름', key: 'investing_cash_flow' },
    { label: '재무활동현금흐름', key: 'financing_cash_flow' },
    { label: '기타', key: 'other_cash_flow' },
    { label: '현금수입지출없는거래', key: 'non_cash_transactions' },
  ]
  const hasAny = years.some((y) => {
    const f = byYear.get(y)
    return f && rows.some((r) => f[r.key] !== null && f[r.key] !== undefined)
  })
  return (
    <SectionCard title="현금흐름표 (Cash Flow)">
      {!hasAny ? (
        <EmptyState>현금흐름표 데이터가 없습니다.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-4 font-normal">항목</th>
                {years.map((y) => (
                  <th key={y} className="py-2 px-3 font-normal text-right">
                    {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key as string} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 pr-4 text-slate-600">{row.label}</td>
                  {years.map((y) => {
                    const v = byYear.get(y)?.[row.key] as number | null | undefined
                    const isNeg = typeof v === 'number' && v < 0
                    return (
                      <td
                        key={y}
                        className={`py-2 px-3 text-right tabular-nums ${
                          isNeg ? 'text-rose-600' : 'text-slate-800'
                        }`}
                      >
                        {fmtThousand(v ?? null)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-2">단위: 천원</p>
        </div>
      )}
    </SectionCard>
  )
}

function ShareholdersSection({
  shareholders,
  shareholderCount,
}: {
  shareholders: Owner[]
  shareholderCount: number | null
}) {
  // Sort: pct desc (nulls last), then name. Lead row (대표주주 in relationship) bubbles up via pct.
  const sorted = [...shareholders].sort((a, b) => {
    const ap = a.ownership_pct ?? -1
    const bp = b.ownership_pct ?? -1
    if (ap !== bp) return bp - ap
    return a.name.localeCompare(b.name, 'ko-KR')
  })
  const totalPct = sorted.reduce((s, o) => s + (o.ownership_pct ?? 0), 0)
  return (
    <SectionCard
      title={`주주정보 / 지분구조${
        shareholderCount !== null && shareholderCount !== undefined
          ? ` (전체 ${shareholderCount.toLocaleString()}명)`
          : ''
      }`}
    >
      {sorted.length === 0 ? (
        <EmptyState>주주 정보가 없습니다.</EmptyState>
      ) : (
        <div className="space-y-2">
          {sorted.map((o) => {
            const pct = o.ownership_pct
            const barWidth = pct !== null ? Math.max(0, Math.min(100, pct)) : 0
            const isLead = (o.relationship ?? '').startsWith('대표주주')
            return (
              <div key={o.id} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-sm">
                  <span className={isLead ? 'font-medium text-slate-900' : 'text-slate-700'}>
                    {o.name}
                  </span>
                  {isLead ? (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      대표
                    </span>
                  ) : null}
                </div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isLead ? 'bg-amber-400' : 'bg-blue-400'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="w-20 shrink-0 text-right text-sm tabular-nums text-slate-700">
                  {pct !== null ? `${pct.toFixed(2)}%` : '-'}
                </div>
                <div className="w-32 shrink-0 text-xs text-slate-400 truncate">
                  {o.relationship ?? ''}
                </div>
              </div>
            )
          })}
          {totalPct > 0 ? (
            <p className="text-xs text-slate-400 pt-1">
              상위 {sorted.length}명 합계: {totalPct.toFixed(2)}%
            </p>
          ) : null}
        </div>
      )}
    </SectionCard>
  )
}

function ExecutivesSection({
  executives,
  executivesRaw,
}: {
  executives: Executive[]
  executivesRaw: string | null
}) {
  return (
    <SectionCard title="임원현황 (Executives)">
      {executives.length === 0 ? (
        executivesRaw ? (
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{executivesRaw}</p>
        ) : (
          <EmptyState>등록된 임원이 없습니다.</EmptyState>
        )
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {executives.map((e) => (
            <li key={e.id} className="flex items-baseline gap-2 text-sm">
              <span className="text-xs text-slate-400 w-24 shrink-0">{e.role ?? '—'}</span>
              <span className="text-slate-800">{e.name}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

function TradePartnersSection({ partners }: { partners: TradePartner[] }) {
  const suppliers = partners.filter((p) => p.kind === 'supplier')
  const customers = partners.filter((p) => p.kind === 'customer')
  if (suppliers.length === 0 && customers.length === 0) {
    return (
      <SectionCard title="공급처 / 판매처 (Suppliers & Customers)">
        <EmptyState>등록된 거래처가 없습니다.</EmptyState>
      </SectionCard>
    )
  }
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <SectionCard title="공급처 (Suppliers)">
        {suppliers.length === 0 ? (
          <EmptyState>등록된 공급처가 없습니다.</EmptyState>
        ) : (
          <ol className="space-y-1.5 text-sm text-slate-700">
            {suppliers.map((p) => (
              <li key={p.id} className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400 w-5 shrink-0">{p.rank}.</span>
                <span>{p.name}</span>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
      <SectionCard title="판매처 (Customers)">
        {customers.length === 0 ? (
          <EmptyState>등록된 판매처가 없습니다.</EmptyState>
        ) : (
          <ol className="space-y-1.5 text-sm text-slate-700">
            {customers.map((p) => (
              <li key={p.id} className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400 w-5 shrink-0">{p.rank}.</span>
                <span>{p.name}</span>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  )
}

function RelatedCompaniesSection({ items }: { items: RelatedCompanyWithLink[] }) {
  return (
    <SectionCard title="관계사 지도 (Related Companies)">
      {items.length === 0 ? (
        <EmptyState>등록된 관계사가 없습니다.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((r) => (
            <li key={r.id} className="py-2 flex items-baseline gap-3">
              <span className="text-xs text-slate-400 w-5 shrink-0">{r.rank}.</span>
              <div className="flex-1">
                {r.linked_company_id ? (
                  <Link
                    href={`/company/${r.linked_company_id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {r.name}
                  </Link>
                ) : (
                  <span className="text-sm text-slate-700">{r.name}</span>
                )}
              </div>
              {r.biz_reg_no ? (
                <span className="text-xs text-slate-400 tabular-nums">{r.biz_reg_no}</span>
              ) : null}
              {!r.linked_company_id && r.biz_reg_no ? (
                <span className="text-[10px] text-slate-400">(외부)</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}
