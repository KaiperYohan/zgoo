// Korean administrative regions (광역시/도) — order by rough size
export const REGIONS = [
  '서울',
  '경기',
  '인천',
  '부산',
  '대구',
  '광주',
  '대전',
  '울산',
  '세종',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
] as const

// KODATA 현금흐름등급 buckets, ordered best→worst.
// CR-1 = strongest cash flow, CR-6 = weakest; NR = not rated, NF = not filed.
export const CF_GRADES = [
  'CR-1',
  'CR-2',
  'CR-3',
  'CR-4',
  'CR-5',
  'CR-6',
  'NR',
  'NF',
] as const

// user types revenue in 억; DB stores in KRW. 1억 = 10^8 KRW.
export const UK_TO_KRW = 100_000_000

export function regionFromAddress(address: string | null | undefined): string | null {
  if (!address) return null
  const first = address.trim().split(/\s+/)[0] ?? ''
  return REGIONS.find((r) => first.startsWith(r)) ?? null
}
