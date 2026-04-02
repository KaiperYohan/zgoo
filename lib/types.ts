export type Stage =
  | 'watchlist'
  | 'contacted'
  | 'meeting'
  | 'nda'
  | 'loi'
  | 'dd'
  | 'closed'

export const STAGES: Stage[] = [
  'watchlist',
  'contacted',
  'meeting',
  'nda',
  'loi',
  'dd',
  'closed',
]

export const STAGE_LABELS: Record<Stage, string> = {
  watchlist: 'Watchlist',
  contacted: 'Contacted',
  meeting: 'Meeting',
  nda: 'NDA',
  loi: 'LOI',
  dd: 'DD',
  closed: 'Closed',
}

export const STAGE_COLORS: Record<Stage, string> = {
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
  body: string
  updated_at: string
}
