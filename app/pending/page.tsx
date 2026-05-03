import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './SignOutButton'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: appUser } = await supabase
    .from('app_users')
    .select('status')
    .eq('id', user.id)
    .maybeSingle()

  if (appUser?.status === 'approved') redirect('/pipeline')

  const rejected = appUser?.status === 'rejected'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
          rejected ? 'bg-rose-100' : 'bg-amber-100'
        }`}>
          {rejected ? (
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <h1 className="text-lg font-semibold text-slate-900">
          {rejected ? 'Access denied' : 'Awaiting approval'}
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          {rejected
            ? 'Your account request was not approved. Contact an administrator if this is a mistake.'
            : 'Your account is pending review. An administrator will approve access shortly.'}
        </p>
        <p className="text-xs text-slate-400 mt-4">{user.email}</p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
