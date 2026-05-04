import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppUser } from '@/lib/types'
import type { FieldRequest } from '@/lib/fieldRequests'
import { AdminClient } from './AdminClient'

interface RequestRow extends FieldRequest {
  company_name: string
  requester_email: string | null
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('app_users')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle()

  if (!me || me.status !== 'approved') redirect('/pending')
  if (me.role !== 'admin') redirect('/pipeline')

  const { data: users } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: counts } = await supabase
    .from('user_watchlist')
    .select('user_id')

  const watchlistCounts = new Map<string, number>()
  for (const row of counts ?? []) {
    watchlistCounts.set(row.user_id, (watchlistCounts.get(row.user_id) ?? 0) + 1)
  }

  const { data: rawRequests } = await supabase
    .from('field_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const requests = (rawRequests ?? []) as FieldRequest[]
  const companyIds = Array.from(new Set(requests.map((r) => r.company_id)))
  const requesterIds = Array.from(
    new Set(requests.map((r) => r.requested_by).filter((x): x is string => !!x))
  )

  const companyNames = new Map<string, string>()
  if (companyIds.length) {
    const { data: cs } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', companyIds)
    for (const c of cs ?? []) companyNames.set(c.id, c.name)
  }

  const requesterEmails = new Map<string, string>()
  if (requesterIds.length) {
    const { data: us } = await supabase
      .from('app_users')
      .select('id, email')
      .in('id', requesterIds)
    for (const u of us ?? []) requesterEmails.set(u.id, u.email)
  }

  const enrichedRequests: RequestRow[] = requests.map((r) => ({
    ...r,
    company_name: companyNames.get(r.company_id) ?? '(unknown)',
    requester_email: r.requested_by ? requesterEmails.get(r.requested_by) ?? null : null,
  }))

  return (
    <AdminClient
      users={(users ?? []) as AppUser[]}
      watchlistCounts={Object.fromEntries(watchlistCounts)}
      currentUserId={user.id}
      requests={enrichedRequests}
    />
  )
}
