'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { FieldKey } from '@/lib/fieldRequests'

interface Props {
  companyId: string
  ownerId?: string
  fieldKey: FieldKey
  initialPending: boolean
}

export function RequestFieldButton({ companyId, ownerId, fieldKey, initialPending }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(initialPending)
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  if (pending) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <ClockIcon /> Requested
      </span>
    )
  }

  const handleClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/field-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ companyId, ownerId, fieldKey }),
      })
      if (res.ok) {
        setPending(true)
        startTransition(() => router.refresh())
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
      title="Request this field from an admin"
    >
      <PlusIcon /> Request
    </button>
  )
}

function PlusIcon() {
  return (
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
