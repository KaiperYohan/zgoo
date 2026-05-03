'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AppUserStatus, AppUserRole } from '@/lib/types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: me } = await supabase
    .from('app_users')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle()
  if (!me || me.role !== 'admin' || me.status !== 'approved') {
    throw new Error('Admin only')
  }
  return { supabase, adminId: user.id }
}

export async function setUserStatus(targetId: string, status: AppUserStatus) {
  const { supabase, adminId } = await requireAdmin()
  const patch: Record<string, unknown> = { status }
  if (status === 'approved') {
    patch.approved_at = new Date().toISOString()
    patch.approved_by = adminId
  }
  const { error } = await supabase.from('app_users').update(patch).eq('id', targetId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function setUserRole(targetId: string, role: AppUserRole) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('app_users').update({ role }).eq('id', targetId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}
