// Catalog of fields that support "Request" buttons on the company detail page.
// `column` is the underlying companies-table column we write into when an admin
// fulfills the request. `parse` converts the typed value into the right shape.

export type FieldKey =
  | 'industry'
  | 'revenue_krw'
  | 'fcf_krw'
  | 'ebitda_pct'
  | 'employees'
  | 'founded'
  | 'ceo_name'
  | 'phone'
  | 'address'
  | 'biz_reg_no'
  | 'cash_flow_grade'
  | 'industry_code'
  | 'company_size'

export interface FieldSpec {
  label: string
  column: string
  type: 'text' | 'int' | 'numeric'
}

export const FIELD_SPECS: Record<FieldKey, FieldSpec> = {
  industry:        { label: 'Industry',         column: 'industry',        type: 'text' },
  revenue_krw:     { label: 'Revenue (KRW)',    column: 'revenue_krw',     type: 'int' },
  fcf_krw:         { label: 'FCF (KRW)',        column: 'fcf_krw',         type: 'int' },
  ebitda_pct:      { label: 'EBITDA %',         column: 'ebitda_pct',      type: 'numeric' },
  employees:       { label: 'Employees',        column: 'employees',       type: 'int' },
  founded:         { label: 'Founded',          column: 'founded',         type: 'int' },
  ceo_name:        { label: '대표자',           column: 'ceo_name',        type: 'text' },
  phone:           { label: '전화번호',         column: 'phone',           type: 'text' },
  address:         { label: '주소',             column: 'address',         type: 'text' },
  biz_reg_no:      { label: '사업자번호',       column: 'biz_reg_no',      type: 'text' },
  cash_flow_grade: { label: '현금흐름등급',     column: 'cash_flow_grade', type: 'text' },
  industry_code:   { label: '업종코드',         column: 'industry_code',   type: 'text' },
  company_size:    { label: '기업규모',         column: 'company_size',    type: 'text' },
}

export function isFieldKey(k: string): k is FieldKey {
  return k in FIELD_SPECS
}

export interface FieldRequest {
  id: string
  company_id: string
  field_key: string
  field_label: string
  requested_by: string | null
  status: 'pending' | 'fulfilled' | 'dismissed'
  note: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}
