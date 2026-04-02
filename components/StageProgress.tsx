'use client'

import { Stage, STAGES, STAGE_LABELS, STAGE_COLORS } from '@/lib/types'

interface StageProgressProps {
  currentStage: Stage
  onStageChange: (stage: Stage) => void
}

export function StageProgress({ currentStage, onStageChange }: StageProgressProps) {
  const currentIndex = STAGES.indexOf(currentStage)

  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const reached = i <= currentIndex
        return (
          <button
            key={stage}
            onClick={() => onStageChange(stage)}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors rounded ${
              stage === currentStage
                ? `${STAGE_COLORS[stage]} ring-1 ring-current`
                : reached
                  ? 'bg-slate-200 text-slate-600'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
          >
            {STAGE_LABELS[stage]}
          </button>
        )
      })}
    </div>
  )
}
