import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: appUser } = await supabase
        .from('app_users')
        .select('status')
        .eq('id', user.id)
        .maybeSingle()

      if (!appUser || appUser.status === 'pending') {
        return NextResponse.redirect(`${origin}/pending`)
      }
      if (appUser.status === 'rejected') {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?rejected=1`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/pipeline`)
}
