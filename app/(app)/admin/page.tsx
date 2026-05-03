import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AppUser } from '@/lib/types'
import { AdminClient } from './AdminClient'

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

  return (
    <AdminClient
      users={(users ?? []) as AppUser[]}
      watchlistCounts={Object.fromEntries(watchlistCounts)}
      currentUserId={user.id}
    />
  )
}
