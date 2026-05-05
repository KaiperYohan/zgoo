import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: upsert the calling user's most recent companies-page search.
// Body: { query: string }  — the URL query string (no leading '?').
export async function POST(req: Request) {
  let body: { query?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const query = (body.query ?? '').slice(0, 4000)

  const { error } = await supabase
    .from('user_search_state')
    .upsert(
      { user_id: user.id, query, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE: wipe the saved search so the next /companies visit starts fresh.
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { error } = await supabase
    .from('user_search_state')
    .delete()
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
