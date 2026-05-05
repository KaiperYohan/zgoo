export type Stage =
  | 'pool'
  | 'watchlist'
  | 'contacted'
  | 'meeting'
  | 'nda'
  | 'loi'
  | 'dd'
  | 'closed'

export const STAGES: Stage[] = [
  'pool',
  'watchlist',
  'contacted',
  'meeting',
  'nda',
  'loi',
  'dd',
  'closed',
]

// Stages that actually show on the kanban pipeline board. `pool` is excluded —
// it's the raw universe (34k+ companies) and only graduates to `watchlist` once
// the user curates it from the companies page.
export const PIPELINE_STAGES: Stage[] = [
  'watchlist',
  'contacted',
  'meeting',
  'nda',
  'loi',
  'dd',
  'closed',
]

export const STAGE_LABELS: Record<Stage, string> = {
  pool: 'Pool',
  watchlist: 'Watchlist',
  contacted: 'Contacted',
  meeting: 'Meeting',
  nda: 'NDA',
  loi: 'LOI',
  dd: 'DD',
  closed: 'Closed',
}

export const STAGE_COLORS: Record<Stage, string> = {
  pool: 'bg-slate-50 text-slate-500',
  watchlist: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  meeting: 'bg-amber-100 text-amber-700',
  nda: 'bg-purple-100 text-purple-700',
  loi: 'bg-orange-100 text-orange-700',
  dd: 'bg-cyan-100 text-cyan-700',
  closed: 'bg-green-100 text-green-700',
}

export interface Company {
  id: string
  name: string
  industry: string | null
  revenue_krw: number | null
  fcf_krw: number | null
  ebitda_pct: number | null
  employees: number | null
  founded: number | null
  stage: Stage
  created_at: string
  updated_at: string
  corp_reg_no: string | null
  biz_reg_no: string | null
  address: string | null
  ceo_name: string | null
  phone: string | null
  industry_code: string | null
  cash_flow_grade: string | null
  company_size: string | null
  company_type: string | null
  legal_form: string | null
  settlement_date: string | null
}

// companies_enriched view: companies + derived columns for M&A screening.
export interface CompanyEnriched extends Company {
  rev_2025_thousand: number | null
  rev_2024_thousand: number | null
  rev_2023_thousand: number | null
  op_2025_thousand: number | null
  op_2024_thousand: number | null
  op_2023_thousand: number | null
  revenue_growth_pct: number | null
  positive_ops_years: number | null
  debt_ratio_latest: number | null
}

export interface Owner {
  id: string
  company_id: string
  name: string
  age: number | null
  phone: string | null
  email: string | null
  background: string | null
  relationship: string | null
  created_at: string
}

export type ActivityType = 'email' | 'call' | 'meeting' | 'note'

export interface Activity {
  id: string
  company_id: string
  type: ActivityType | null
  body: string
  occurred_at: string
  created_at: string
}

export interface Note {
  id: string
  company_id: string
  user_id: string | null
  body: string
  created_at: string
  updated_at: string
}

// Notes joined with their author's email for display in the thread.
export interface NoteWithAuthor extends Note {
  author_email: string | null
}

export type AppUserStatus = 'pending' | 'approved' | 'rejected'
export type AppUserRole = 'member' | 'admin'

export interface AppUser {
  id: string
  email: string
  display_name: string | null
  status: AppUserStatus
  role: AppUserRole
  created_at: string
  approved_at: string | null
  approved_by: string | null
}

export interface WatchlistEntry {
  user_id: string
  company_id: string
  created_at: string
}

