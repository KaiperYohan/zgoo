import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Add a company to the calling user's personal watchlist. If the company is
// still in 'pool' (i.e., not yet on the kanban), promote it to 'watchlist'
// so the shared kanban shows it — the kanban is the union of every user's
// watchlisted companies.
export async function POST(req: Request) {
  let body: { companyId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const companyId = body.companyId
  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { error: insertErr } = await supabase
    .from('user_watchlist')
    .insert({ user_id: user.id, company_id: companyId })
  // Ignore unique-violation: already on user's list.
  if (insertErr && insertErr.code !== '23505') {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('stage')
    .eq('id', companyId)
    .single()

  if (company?.stage === 'pool') {
    await supabase
      .from('companies')
      .update({ stage: 'watchlist', updated_at: new Date().toISOString() })
      .eq('id', companyId)
  }

  return NextResponse.json({ ok: true })
}

// Remove a company from the calling user's personal watchlist. We do NOT
// move the company back to 'pool' — once it's on the kanban it belongs to
// the shared pipeline, even if no one is personally tracking it anymore.
export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const companyId = url.searchParams.get('companyId')
  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { error } = await supabase
    .from('user_watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('company_id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
