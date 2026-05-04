import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FIELD_SPECS, isFieldKey } from '@/lib/fieldRequests'

// POST: any approved user can create a request for an empty field on a company.
export async function POST(req: Request) {
  let body: { companyId?: string; fieldKey?: string; note?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { companyId, fieldKey, note } = body
  if (!companyId || !fieldKey) {
    return NextResponse.json({ error: 'companyId and fieldKey required' }, { status: 400 })
  }
  if (!isFieldKey(fieldKey)) {
    return NextResponse.json({ error: `Unknown field: ${fieldKey}` }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const spec = FIELD_SPECS[fieldKey]
  const { error } = await supabase.from('field_requests').insert({
    company_id: companyId,
    field_key: fieldKey,
    field_label: spec.label,
    requested_by: user.id,
    note: note?.trim() || null,
  })

  // 23505 = unique violation: there is already a pending request for this
  // (company, field). That's a no-op, not an error.
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
