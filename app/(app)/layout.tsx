import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, email, role, status')
    .eq('id', user.id)
    .maybeSingle()

  if (!appUser || appUser.status !== 'approved') redirect('/pending')

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        userId={appUser.id}
        userEmail={appUser.email || user.email || ''}
        isAdmin={appUser.role === 'admin'}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
