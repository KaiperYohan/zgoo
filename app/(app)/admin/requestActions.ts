'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { FIELD_SPECS, isFieldKey } from '@/lib/fieldRequests'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: me } = await supabase
    .from('app_users')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle()
  if (!me || me.role !== 'admin' || me.status !== 'approved') {
    throw new Error('Admin only')
  }
  return { supabase, adminId: user.id }
}

// Admin types in the value the requester was missing. We write it onto the
// company row and mark the request fulfilled in one go.
export async function fulfillFieldRequest(requestId: string, rawValue: string) {
  const { supabase, adminId } = await requireAdmin()

  const { data: req } = await supabase
    .from('field_requests')
    .select('id, company_id, field_key, status')
    .eq('id', requestId)
    .maybeSingle()

  if (!req) throw new Error('Request not found')
  if (req.status !== 'pending') throw new Error('Request already resolved')
  if (!isFieldKey(req.field_key)) throw new Error(`Unknown field: ${req.field_key}`)

  const spec = FIELD_SPECS[req.field_key]
  const trimmed = rawValue.trim()
  if (!trimmed) throw new Error('Value required')

  let parsed: string | number | null
  if (spec.type === 'int') {
    const n = parseInt(trimmed, 10)
    if (!Number.isFinite(n)) throw new Error('Must be a whole number')
    parsed = n
  } else if (spec.type === 'numeric') {
    const n = parseFloat(trimmed)
    if (!Number.isFinite(n)) throw new Error('Must be a number')
    parsed = n
  } else {
    parsed = trimmed
  }

  const { error: updateErr } = await supabase
    .from('companies')
    .update({ [spec.column]: parsed, updated_at: new Date().toISOString() })
    .eq('id', req.company_id)
  if (updateErr) throw new Error(updateErr.message)

  const { error: reqErr } = await supabase
    .from('field_requests')
    .update({
      status: 'fulfilled',
      resolved_at: new Date().toISOString(),
      resolved_by: adminId,
    })
    .eq('id', requestId)
  if (reqErr) throw new Error(reqErr.message)

  revalidatePath('/admin')
  revalidatePath(`/company/${req.company_id}`)
}

export async function dismissFieldRequest(requestId: string) {
  const { supabase, adminId } = await requireAdmin()
  const { error } = await supabase
    .from('field_requests')
    .update({
      status: 'dismissed',
      resolved_at: new Date().toISOString(),
      resolved_by: adminId,
    })
    .eq('id', requestId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}
