import { createClient } from '@/lib/supabase/server'
import { CompaniesTable } from './CompaniesTable'

export default async function CompaniesPage() {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: owners } = await supabase
    .from('owners')
    .select('*')

  const companiesWithOwners = (companies || []).map(c => ({
    ...c,
    owner: (owners || []).find(o => o.company_id === c.id) || null,
  }))

  return <CompaniesTable initialCompanies={companiesWithOwners} />
}
