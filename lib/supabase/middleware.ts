import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth']
const PENDING_OK_PATHS = ['/pending', '/auth', '/login']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p))
  const isPendingOk = PENDING_OK_PATHS.some((p) => path.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Logged-in users still need approval. The middleware can't query app_users
  // without rebuilding the Supabase context, so we do a single status fetch.
  if (user && !isPendingOk) {
    const { data: appUser } = await supabase
      .from('app_users')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    if (!appUser || appUser.status === 'pending') {
      const url = request.nextUrl.clone()
      url.pathname = '/pending'
      return NextResponse.redirect(url)
    }
    if (appUser.status === 'rejected') {
      // Sign them out and bounce to login with a flag.
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('rejected', '1')
      return NextResponse.redirect(url)
    }
  }

  // If an approved user lands on /pending, send them home.
  if (user && path.startsWith('/pending')) {
    const { data: appUser } = await supabase
      .from('app_users')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()
    if (appUser?.status === 'approved') {
      const url = request.nextUrl.clone()
      url.pathname = '/pipeline'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
