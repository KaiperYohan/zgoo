import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STAGES, Stage } from '@/lib/types'
import {
  parseCompanyFilters,
  collectAllMatchingIds,
  SP,
} from '@/lib/parseCompanyFilters'

// Hard cap matching the "Save to my page" button on /companies — silently
// truncate to the top N matches by current sort. Any larger save is almost
// always an accident (you don't manually triage 1k+ companies).
const MAX_ROWS_PER_CALL = 1000
// Supabase/PostgREST chokes on very long `IN` lists; chunk UPDATEs.
const UPDATE_CHUNK = 500

export async function POST(req: Request) {
  let body: { filters?: Record<string, string | string[]>; toStage?: string; dryRun?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const toStage = body.toStage
  if (!toStage || !STAGES.includes(toStage as Stage)) {
    return NextResponse.json({ error: `Invalid toStage` }, { status: 400 })
  }

  const sp: SP = body.filters ?? {}
  const parsed = parseCompanyFilters(sp)

  const supabase = await createClient()

  let ids: string[]
  try {
    // Silently truncate to MAX_ROWS_PER_CALL — the UI confirm message already
    // tells the user only the top N will be saved.
    ids = await collectAllMatchingIds(supabase, parsed, MAX_ROWS_PER_CALL)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Select failed: ${msg}` }, { status: 500 })
  }
  ids = ids.slice(0, MAX_ROWS_PER_CALL)

  if (body.dryRun) {
    return NextResponse.json({ count: ids.length, updated: 0 })
  }

  let updated = 0
  for (let i = 0; i < ids.length; i += UPDATE_CHUNK) {
    const chunk = ids.slice(i, i + UPDATE_CHUNK)
    const { error } = await supabase
      .from('companies')
      .update({ stage: toStage, updated_at: new Date().toISOString() })
      .in('id', chunk)
    if (error) {
      return NextResponse.json(
        { error: `Update failed at offset ${i}: ${error.message}`, updated },
        { status: 500 }
      )
    }
    updated += chunk.length
  }

  // Promoting companies onto the kanban also adds them to the calling user's
  // personal watchlist — the kanban is the union of every user's watchlist,
  // so anything that lands there must be owned by someone.
  if (toStage !== 'pool') {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      for (let i = 0; i < ids.length; i += UPDATE_CHUNK) {
        const chunk = ids.slice(i, i + UPDATE_CHUNK)
        await supabase
          .from('user_watchlist')
          .upsert(
            chunk.map((id) => ({ user_id: user.id, company_id: id })),
            { onConflict: 'user_id,company_id', ignoreDuplicates: true }
          )
      }
    }
  }

  return NextResponse.json({ count: ids.length, updated })
}
