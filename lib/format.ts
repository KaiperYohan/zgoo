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

// All timestamps in the DB are timestamptz (UTC). The team works in Korea, so
// display everything in KST regardless of the viewer's browser timezone.
const KST = 'Asia/Seoul'

export function formatKstDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatKstDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const date = d.toLocaleDateString('ko-KR', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const time = d.toLocaleTimeString('ko-KR', {
    timeZone: KST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${date} ${time}`
}

// Relative for recent timestamps, KST-formatted absolute date for older ones.
export function formatKstRelative(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return formatKstDate(iso)
}

