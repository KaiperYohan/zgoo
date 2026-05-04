import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompanyDetail } from './CompanyDetail'

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (!company) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: owners } = await supabase
    .from('owners')
    .select('*')
    .eq('company_id', id)
    .limit(1)

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('company_id', id)
    .order('occurred_at', { ascending: false })

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('company_id', id)
    .order('updated_at', { ascending: false })
    .limit(1)

  let watched = false
  if (user) {
    const { data: w } = await supabase
      .from('user_watchlist')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', id)
      .maybeSingle()
    watched = !!w
  }

  const { data: pendingReqs } = await supabase
    .from('field_requests')
    .select('field_key, owner_id')
    .eq('company_id', id)
    .eq('status', 'pending')

  // Split into company-scoped vs. owner-scoped pending fields. The same
  // field_key (e.g. 'phone' vs. 'owner_phone') is unambiguous, but we still
  // want to filter owner-pending entries to the actual owner being shown.
  const pendingFields = new Set<string>()
  const pendingOwnerFields = new Set<string>()
  const ownerId = owners?.[0]?.id
  for (const r of pendingReqs ?? []) {
    if (r.owner_id == null) {
      pendingFields.add(r.field_key)
    } else if (ownerId && r.owner_id === ownerId) {
      pendingOwnerFields.add(r.field_key)
    }
  }

  return (
    <CompanyDetail
      company={company}
      owner={owners?.[0] || null}
      activities={activities || []}
      note={notes?.[0] || null}
      initialWatched={watched}
      pendingFields={Array.from(pendingFields)}
      pendingOwnerFields={Array.from(pendingOwnerFields)}
    />
  )
}
