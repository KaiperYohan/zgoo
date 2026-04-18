'use client'

import { useState, useRef, useEffect } from 'react'
import { REGIONS, CF_GRADES } from '@/lib/filters'

export interface FilterState {
  revMin: number | null
  revMax: number | null
  empMin: number | null
  empMax: number | null
  marMin: number | null
  marMax: number | null
  foundedFrom: number | null
  foundedTo: number | null
  growthMin: number | null
  growthMax: number | null
  profitYearsMin: number | null
  debtMax: number | null
  regions: string[]
  grades: string[]
  industry: string
}

interface Props {
  value: FilterState
  onChange: (patch: Partial<Record<keyof FilterState, string | null>>) => void
  onClear: () => void
}

function numOrNull(v: string): string | null {
  return v === '' ? null : v
}

export function FiltersPanel({ value, onChange, onClear }: Props) {
  const activeCount =
    (value.revMin !== null ? 1 : 0) +
    (value.revMax !== null ? 1 : 0) +
    (value.empMin !== null ? 1 : 0) +
    (value.empMax !== null ? 1 : 0) +
    (value.marMin !== null ? 1 : 0) +
    (value.marMax !== null ? 1 : 0) +
    (value.foundedFrom !== null ? 1 : 0) +
    (value.foundedTo !== null ? 1 : 0) +
    (value.growthMin !== null ? 1 : 0) +
    (value.growthMax !== null ? 1 : 0) +
    (value.profitYearsMin !== null ? 1 : 0) +
    (value.debtMax !== null ? 1 : 0) +
    (value.regions.length > 0 ? 1 : 0) +
    (value.grades.length > 0 ? 1 : 0) +
    (value.industry !== '' ? 1 : 0)

  return (
    <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/50">
      <div className="flex flex-wrap items-center gap-2">
        <RangeInput
          label="Revenue (억)"
          min={value.revMin}
          max={value.revMax}
          onMin={(v) => onChange({ revMin: numOrNull(v) })}
          onMax={(v) => onChange({ revMax: numOrNull(v) })}
        />
        <RangeInput
          label="Margin %"
          min={value.marMin}
          max={value.marMax}
          onMin={(v) => onChange({ marMin: numOrNull(v) })}
          onMax={(v) => onChange({ marMax: numOrNull(v) })}
        />
        <RangeInput
          label="Employees"
          min={value.empMin}
          max={value.empMax}
          onMin={(v) => onChange({ empMin: numOrNull(v) })}
          onMax={(v) => onChange({ empMax: numOrNull(v) })}
        />
        <RangeInput
          label="Founded"
          min={value.foundedFrom}
          max={value.foundedTo}
          onMin={(v) => onChange({ foundedFrom: numOrNull(v) })}
          onMax={(v) => onChange({ foundedTo: numOrNull(v) })}
          placeholderMin="1990"
          placeholderMax="2025"
        />
        <MultiSelect
          label="Region"
          options={REGIONS as readonly string[]}
          selected={value.regions}
          onChange={(arr) => onChange({ regions: arr.length ? arr.join(',') : null })}
        />
        <MultiSelect
          label="CF Grade"
          options={CF_GRADES as readonly string[]}
          selected={value.grades}
          onChange={(arr) => onChange({ grades: arr.length ? arr.join(',') : null })}
        />
        <RangeInput
          label="YoY Growth %"
          min={value.growthMin}
          max={value.growthMax}
          onMin={(v) => onChange({ growthMin: numOrNull(v) })}
          onMax={(v) => onChange({ growthMax: numOrNull(v) })}
        />
        <ProfitYearsSelect
          value={value.profitYearsMin}
          onChange={(v) => onChange({ profitYearsMin: numOrNull(v) })}
        />
        <MinInput
          label="Debt Ratio ≤"
          suffix="%"
          value={value.debtMax}
          onChange={(v) => onChange({ debtMax: numOrNull(v) })}
          placeholder="200"
          width="w-14"
        />
        <IndustryInput
          value={value.industry}
          onChange={(v) => onChange({ industry: v || null })}
        />
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-slate-700 underline ml-auto"
          >
            Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
          </button>
        )}
      </div>
    </div>
  )
}

function RangeInput({
  label,
  min,
  max,
  onMin,
  onMax,
  placeholderMin = 'min',
  placeholderMax = 'max',
}: {
  label: string
  min: number | null
  max: number | null
  onMin: (v: string) => void
  onMax: (v: string) => void
  placeholderMin?: string
  placeholderMax?: string
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <input
        type="number"
        value={min ?? ''}
        onChange={(e) => onMin(e.target.value)}
        placeholder={placeholderMin}
        className="w-16 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <span className="text-slate-400">–</span>
      <input
        type="number"
        value={max ?? ''}
        onChange={(e) => onMax(e.target.value)}
        placeholder={placeholderMax}
        className="w-16 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onChange: (s: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((x) => x !== opt))
    else onChange([...selected, opt])
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1 border border-slate-200 rounded text-xs hover:bg-slate-50 flex items-center gap-1"
      >
        <span className="text-slate-500">{label}</span>
        {selected.length > 0 && (
          <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 text-[10px] font-medium">
            {selected.length}
          </span>
        )}
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[140px] max-h-80 overflow-auto">
          {options.map((o) => (
            <label
              key={o}
              className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer text-xs"
            >
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={() => toggle(o)}
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function MinInput({
  label,
  suffix,
  value,
  onChange,
  placeholder,
  width = 'w-16',
}: {
  label: string
  suffix?: string
  value: number | null
  onChange: (v: string) => void
  placeholder?: string
  width?: string
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${width} px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500`}
      />
      {suffix && <span className="text-slate-400">{suffix}</span>}
    </div>
  )
}

function ProfitYearsSelect({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-slate-500">Profit Yrs ≥</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">any</option>
        <option value="1">1/3</option>
        <option value="2">2/3</option>
        <option value="3">3/3</option>
      </select>
    </div>
  )
}

function IndustryInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  useEffect(() => {
    if (local === value) return
    const t = setTimeout(() => onChange(local), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local])

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-slate-500">Industry</span>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="contains…"
        className="w-32 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}
