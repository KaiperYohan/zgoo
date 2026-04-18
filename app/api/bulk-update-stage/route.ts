import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STAGES, Stage } from '@/lib/types'
import {
  parseCompanyFilters,
  collectAllMatchingIds,
  SP,
} from '@/lib/parseCompanyFilters'

// Safety cap — refuse to bulk-move more than this in one shot. If you really
// want to move 30k pool → watchlist at once, raise this (and brace yourself).
const MAX_ROWS_PER_CALL = 20000
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
    ids = await collectAllMatchingIds(supabase, parsed, MAX_ROWS_PER_CALL + 1)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Select failed: ${msg}` }, { status: 500 })
  }

  if (ids.length > MAX_ROWS_PER_CALL) {
    return NextResponse.json(
      {
        error: `Too many rows (${ids.length}). Narrow your filter (max ${MAX_ROWS_PER_CALL} per call).`,
      },
      { status: 400 }
    )
  }

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

  return NextResponse.json({ count: ids.length, updated })
}
