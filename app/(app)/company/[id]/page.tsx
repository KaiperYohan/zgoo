import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompanyDetail } from './CompanyDetail'

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (!company) notFound()

  const { data: owners } = await supabase
    .from('owners')
    .select('*')
    .eq('company_id', id)
    .limit(1)

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('company_id', id)
    .order('occurred_at', { ascending: false })

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('company_id', id)
    .order('updated_at', { ascending: false })
    .limit(1)

  return (
    <CompanyDetail
      company={company}
      owner={owners?.[0] || null}
      activities={activities || []}
      note={notes?.[0] || null}
    />
  )
}
