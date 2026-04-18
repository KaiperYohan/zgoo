'use client'

import { useState, useRef } from 'react'
import { Company, Owner, Stage, PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS } from '@/lib/types'
import { DealCard } from './DealCard'
import { AddCompanyModal } from './AddCompanyModal'
import { createClient } from '@/lib/supabase/client'

type CompanyWithOwner = Company & { owner?: Owner | null }

interface KanbanBoardProps {
  initialCompanies: CompanyWithOwner[]
}

export function KanbanBoard({ initialCompanies }: KanbanBoardProps) {
  const [companies, setCompanies] = useState(initialCompanies)
  const [dragItem, setDragItem] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null)
  const [addingToStage, setAddingToStage] = useState<Stage | null>(null)
  const dragCounter = useRef<Record<string, number>>({})

  const grouped = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = companies.filter(c => c.stage === stage)
    return acc
  }, {} as Record<Stage, CompanyWithOwner[]>)

  const handleDragStart = (e: React.DragEvent, companyId: string) => {
    setDragItem(companyId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnter = (stage: Stage) => {
    dragCounter.current[stage] = (dragCounter.current[stage] || 0) + 1
    setDragOverStage(stage)
  }

  const handleDragLeave = (stage: Stage) => {
    dragCounter.current[stage] = (dragCounter.current[stage] || 0) - 1
    if (dragCounter.current[stage] <= 0) {
      dragCounter.current[stage] = 0
      if (dragOverStage === stage) setDragOverStage(null)
    }
  }

  const handleDrop = async (stage: Stage) => {
    dragCounter.current = {}
    setDragOverStage(null)

    if (!dragItem) return
    const company = companies.find(c => c.id === dragItem)
    if (!company || company.stage === stage) {
      setDragItem(null)
      return
    }

    // Optimistic update
    setCompanies(prev =>
      prev.map(c => (c.id === dragItem ? { ...c, stage } : c))
    )
    setDragItem(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('companies')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', dragItem)

    if (error) {
      // Revert on failure
      setCompanies(prev =>
        prev.map(c => (c.id === dragItem ? { ...c, stage: company.stage } : c))
      )
    }
  }

  return (
    <>
    <div className="flex gap-3 h-full overflow-x-auto p-6">
      {PIPELINE_STAGES.map(stage => (
        <div
          key={stage}
          className={`flex-shrink-0 w-72 flex flex-col rounded-xl transition-colors ${
            dragOverStage === stage ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-slate-100/60'
          }`}
          onDragOver={e => e.preventDefault()}
          onDragEnter={() => handleDragEnter(stage)}
          onDragLeave={() => handleDragLeave(stage)}
          onDrop={() => handleDrop(stage)}
        >
          {/* Column header */}
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
                {STAGE_LABELS[stage]}
              </span>
              <span className="text-xs text-slate-400 font-medium">{grouped[stage].length}</span>
            </div>
            <button
              onClick={() => setAddingToStage(stage)}
              className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              title="Add company"
            >
              +
            </button>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
            {grouped[stage].map(company => (
              <div
                key={company.id}
                draggable
                onDragStart={e => handleDragStart(e, company.id)}
                onDragEnd={() => { setDragItem(null); setDragOverStage(null); dragCounter.current = {} }}
              >
                <DealCard company={company} dragging={dragItem === company.id} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    {addingToStage && (
      <AddCompanyModal
        initialStage={addingToStage}
        onClose={() => setAddingToStage(null)}
        onAdded={(company) => {
          setCompanies(prev => [{ ...company, owner: null }, ...prev])
          setAddingToStage(null)
        }}
      />
    )}
    </>
  )
}
