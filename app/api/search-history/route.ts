import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HISTORY_LIMIT = 50

// GET: list the calling user's recent searches, newest first.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase
    .from('search_history')
    .select('query, last_used_at')
    .eq('user_id', user.id)
    .order('last_used_at', { ascending: false })
    .limit(HISTORY_LIMIT)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ entries: data ?? [] })
}

// POST: upsert a (user, query) pair, bumping last_used_at.
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

  // Empty queries shouldn't pollute history — they represent the bare
  // /companies page, which is the implicit fallback when nothing is saved.
  const query = (body.query ?? '').slice(0, 4000).trim()
  if (!query) return NextResponse.json({ ok: true, skipped: true })

  const { error } = await supabase
    .from('search_history')
    .upsert(
      { user_id: user.id, query, last_used_at: new Date().toISOString() },
      { onConflict: 'user_id,query' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE: remove a single entry (?query=...) or wipe the whole history (no param).
export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const query = url.searchParams.get('query')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const builder = supabase.from('search_history').delete().eq('user_id', user.id)
  const { error } = query !== null
    ? await builder.eq('query', query)
    : await builder
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
