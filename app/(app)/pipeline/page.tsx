import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/KanbanBoard'
import Link from 'next/link'

export default async function PipelinePage() {
  const supabase = await createClient()

  // Exclude `pool` — that's the raw KODATA universe, 34k+ rows that would crash
  // the kanban. Only surface curated stages here.
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .neq('stage', 'pool')
    .order('updated_at', { ascending: false })

  const ids = (companies ?? []).map((c) => c.id)
  const { data: owners } = ids.length
    ? await supabase.from('owners').select('*').in('company_id', ids)
    : { data: [] as Array<{ company_id: string }> }

  // Attach first owner to each company
  const companiesWithOwners = (companies || []).map(c => ({
    ...c,
    owner: (owners || []).find(o => o.company_id === c.id) || null,
  }))

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Pipeline</h1>
          <p className="text-xs text-slate-500">{companies?.length || 0} companies</p>
        </div>
        <Link
          href="/companies?new=1"
          className="px-3.5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          + Add company
        </Link>
      </header>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard initialCompanies={companiesWithOwners} />
      </div>
    </div>
  )
}
