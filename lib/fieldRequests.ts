// Catalog of fields that support "Request" buttons. Each field is scoped to
// either the companies table or the owners table — the fulfill action looks at
// `entity` to decide where to write. `column` is the underlying column name.

export type Entity = 'company' | 'owner'

export type FieldKey =
  // companies.*
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
  // owners.*
  | 'owner_age'
  | 'owner_phone'
  | 'owner_email'
  | 'owner_background'
  | 'owner_relationship'

export interface FieldSpec {
  label: string
  column: string
  type: 'text' | 'int' | 'numeric'
  entity: Entity
}

export const FIELD_SPECS: Record<FieldKey, FieldSpec> = {
  industry:        { label: 'Industry',         column: 'industry',        type: 'text',    entity: 'company' },
  revenue_krw:     { label: 'Revenue (KRW)',    column: 'revenue_krw',     type: 'int',     entity: 'company' },
  fcf_krw:         { label: 'FCF (KRW)',        column: 'fcf_krw',         type: 'int',     entity: 'company' },
  ebitda_pct:      { label: 'EBITDA %',         column: 'ebitda_pct',      type: 'numeric', entity: 'company' },
  employees:       { label: 'Employees',        column: 'employees',       type: 'int',     entity: 'company' },
  founded:         { label: 'Founded',          column: 'founded',         type: 'int',     entity: 'company' },
  ceo_name:        { label: '대표자',           column: 'ceo_name',        type: 'text',    entity: 'company' },
  phone:           { label: '전화번호',         column: 'phone',           type: 'text',    entity: 'company' },
  address:         { label: '주소',             column: 'address',         type: 'text',    entity: 'company' },
  biz_reg_no:      { label: '사업자번호',       column: 'biz_reg_no',      type: 'text',    entity: 'company' },
  cash_flow_grade: { label: '현금흐름등급',     column: 'cash_flow_grade', type: 'text',    entity: 'company' },
  industry_code:   { label: '업종코드',         column: 'industry_code',   type: 'text',    entity: 'company' },
  company_size:    { label: '기업규모',         column: 'company_size',    type: 'text',    entity: 'company' },

  owner_age:          { label: 'Owner: Age',          column: 'age',          type: 'int',  entity: 'owner' },
  owner_phone:        { label: 'Owner: Phone',        column: 'phone',        type: 'text', entity: 'owner' },
  owner_email:        { label: 'Owner: Email',        column: 'email',        type: 'text', entity: 'owner' },
  owner_background:   { label: 'Owner: Background',   column: 'background',   type: 'text', entity: 'owner' },
  owner_relationship: { label: 'Owner: Relationship', column: 'relationship', type: 'text', entity: 'owner' },
}

export function isFieldKey(k: string): k is FieldKey {
  return k in FIELD_SPECS
}

export interface FieldRequest {
  id: string
  company_id: string
  owner_id: string | null
  field_key: string
  field_label: string
  requested_by: string | null
  status: 'pending' | 'fulfilled' | 'dismissed'
  note: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}
