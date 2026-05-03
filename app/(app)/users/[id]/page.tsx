import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppUser, Company } from '@/lib/types'
import { UserPageClient } from './UserPageClient'

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', id)
    .maybeSingle<AppUser>()

  if (!profile) notFound()

  const { data: watchlist } = await supabase
    .from('user_watchlist')
    .select('company_id, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  const companyIds = (watchlist ?? []).map((w) => w.company_id)
  const { data: companies } = companyIds.length
    ? await supabase.from('companies').select('*').in('id', companyIds)
    : { data: [] as Company[] }

  const addedAt = new Map<string, string>()
  for (const w of watchlist ?? []) addedAt.set(w.company_id, w.created_at)

  const enriched = (companies ?? [])
    .map((c) => ({ ...c, addedAt: addedAt.get(c.id) ?? null }))
    .sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))

  const isSelf = user.id === id

  return (
    <UserPageClient
      profile={profile}
      companies={enriched}
      isSelf={isSelf}
    />
  )
}
