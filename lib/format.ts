export function formatKRW(value: number | null): string {
  if (value === null || value === undefined) return '-'
  const billion = 100_000_000 // 억
  if (Math.abs(value) >= billion) {
    return `${(value / billion).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`
  }
  return `${(value / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만`
}

export function formatPct(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(1)}%`
}
