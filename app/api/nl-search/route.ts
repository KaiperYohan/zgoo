import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { REGIONS, CF_GRADES } from '@/lib/filters'
import { STAGES } from '@/lib/types'

// Stateless, per-request API key. The ANTHROPIC_API_KEY env var MUST be set
// server-side — never expose to the client.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Stable prefix → cacheable. Keep this deterministic: no timestamps, no per-
// request data. Kept small on purpose — Haiku 4.5's minimum cacheable prefix
// is ~4096 tokens, so caching may not activate until this grows. Harmless
// either way (cache_control is a no-op below that threshold).
const SYSTEM_PROMPT = `당신은 M&A 인수 대상 기업을 찾는 사용자의 자연어 요청을 구조화된 필터로 변환합니다.

데이터는 KODATA의 한국 비상장외감법인 데이터셋입니다 (약 35,000개 기업).

### Filter schema (반환할 필드)

- **q** (string): 회사명/업종/대표자/법인번호/사업자번호 자유 검색 (부분일치). 특정 회사명이나 식별자를 찾는 경우에 사용. 사업자번호는 KODATA 원본 형식대로 저장되어 있으므로 입력값을 그대로 유지할 것 (보통 하이픈 포함, 예: "123-45-67890").
- **stage** (enum): ${STAGES.join(' | ')}. 기본 pool(전체 풀). 특별 언급 없으면 생략.
- **revMin / revMax** (number, 억 KRW): 매출액 범위. "100억" → 100, "1조" → 10000.
- **empMin / empMax** (number): 종업원 수 범위.
- **marMin / marMax** (number, %): 영업이익률 범위. 음수도 허용 (적자). "흑자" → marMin: 0. "-5%~5%" 또는 "-5%에서 5% 사이" → marMin: -5, marMax: 5. "적자 심한" → marMax: -10.
- **foundedFrom / foundedTo** (number, 서기연도): 설립연도 범위. "10년 이상" → foundedTo: 현재연도-10.
- **growthMin / growthMax** (number, %): YoY 매출 성장률 범위. 음수 허용. "성장하는" → growthMin: 10, "고성장" → growthMin: 20. "YoY -5%~5%" 또는 "성장률 -5에서 5 사이" → growthMin: -5, growthMax: 5. "역성장" → growthMax: 0.
- **profitYearsMin** (0-3): 최근 3년 중 흑자 연수 최소. "3년 연속 흑자" → 3.
- **debtMax** (number, %): 부채비율 최대치. "재무건전한" → 100.
- **regions** (string[]): ${REGIONS.join(' / ')} 중 복수 선택. "수도권" → [서울, 경기, 인천]. "지방" → 수도권 제외 나머지.
- **grades** (string[]): ${CF_GRADES.join(' / ')} 중 복수 선택. CR-1이 가장 우량, CR-6이 가장 취약, NR은 미평가, NF는 미제출. "우량" → [CR-1, CR-2]. "양호 이상" → [CR-1, CR-2, CR-3]. "취약" → [CR-5, CR-6].
- **industry** (string): 업종명 부분일치 문자열. "제조" / "바이오" / "IT" 등. 구체적 업종이 언급될 때만 사용.
- **explanation** (string, 필수): 한국어 한두 문장으로 "이해한 필터"를 요약.

### 중요 규칙

1. **완전한 desired state를 반환** — 현재 필터가 주어지면, 사용자 요청을 반영한 최종 상태 전체를 반환. 제거할 필터는 생략.
2. **확신이 없는 필드는 생략** — 사용자가 말하지 않은 것은 포함하지 말 것.
3. **explanation은 반드시 채울 것** — 어떤 필터를 설정했는지 요약.
4. **tool을 반드시 호출** — 직접 답변하지 말고 apply_filters 도구를 사용.

### 예시

User: "수도권 제조업, 50-500억 매출, 3년 연속 흑자"
→ regions: ['서울','경기','인천'], industry: '제조', revMin: 50, revMax: 500, profitYearsMin: 3, explanation: '수도권(서울/경기/인천) 제조업, 매출 50-500억, 최근 3년 연속 흑자 기업을 찾습니다.'

User: "부채 적고 고성장하는 바이오 기업"
→ industry: '바이오', debtMax: 100, growthMin: 20, explanation: '부채비율 100% 이하, YoY 매출 성장률 20% 이상인 바이오 업종 기업입니다.'

User: "영업이익률 -5%에서 5% 사이인 기업"
→ marMin: -5, marMax: 5, explanation: '영업이익률이 -5%~5% 범위(손익분기 근처)인 기업입니다.'

User: "매출성장률 -5%에서 5%인 기업" 또는 "YoY -5% ~ 5%"
→ growthMin: -5, growthMax: 5, explanation: 'YoY 매출 성장률이 -5%~5% 범위인 기업입니다.'

User: "설립 10년 이상, 매출 300억 이하"
→ foundedTo: ${new Date().getFullYear() - 10}, revMax: 300, explanation: '설립 10년 이상, 매출 300억 이하 기업입니다.'

User (with current filters {revMin: 50}): "부채비율도 100% 이하로"
→ revMin: 50, debtMax: 100, explanation: '기존 매출 50억 이상 조건에 부채비율 100% 이하 조건을 추가했습니다.'`

// tool_use gives guaranteed JSON matching the schema. Forced via tool_choice.
const APPLY_FILTERS_TOOL: Anthropic.Tool = {
  name: 'apply_filters',
  description:
    'Apply the extracted M&A screening filters. Return the complete desired filter state, not a delta — the frontend replaces all active filters with what you return.',
  input_schema: {
    type: 'object',
    properties: {
      q: { type: 'string', description: '자유 텍스트 검색 (회사명/업종/대표자/법인번호/사업자번호 부분일치)' },
      stage: { type: 'string', enum: STAGES as unknown as string[] },
      revMin: { type: 'number', description: '최소 매출액 (억 KRW)' },
      revMax: { type: 'number', description: '최대 매출액 (억 KRW)' },
      empMin: { type: 'number' },
      empMax: { type: 'number' },
      marMin: { type: 'number', description: '최소 영업이익률 (%)' },
      marMax: { type: 'number', description: '최대 영업이익률 (%)' },
      foundedFrom: { type: 'number', description: '최소 설립연도 (서기)' },
      foundedTo: { type: 'number', description: '최대 설립연도 (서기)' },
      growthMin: { type: 'number', description: '최소 YoY 매출 성장률 (%), 음수 허용' },
      growthMax: { type: 'number', description: '최대 YoY 매출 성장률 (%), 음수 허용' },
      profitYearsMin: {
        type: 'integer',
        minimum: 0,
        maximum: 3,
        description: '최근 3년 중 흑자 연수 최소치',
      },
      debtMax: { type: 'number', description: '최대 부채비율 (%)' },
      regions: {
        type: 'array',
        items: { type: 'string', enum: REGIONS as unknown as string[] },
      },
      grades: {
        type: 'array',
        items: { type: 'string', enum: CF_GRADES as unknown as string[] },
      },
      industry: { type: 'string', description: '업종명 부분일치' },
      explanation: {
        type: 'string',
        description: '한국어 한두 문장으로 적용된 필터 요약. 반드시 채울 것.',
      },
    },
    required: ['explanation'],
  },
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    )
  }

  let body: { query?: string; currentFilters?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const query = body.query?.trim()
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const userContent = body.currentFilters
    ? `현재 적용된 필터:\n${JSON.stringify(body.currentFilters, null, 2)}\n\n사용자 요청:\n${query}`
    : query

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [APPLY_FILTERS_TOOL],
      tool_choice: { type: 'tool', name: 'apply_filters' },
      messages: [{ role: 'user', content: userContent }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    if (!toolUse) {
      return NextResponse.json(
        { error: 'Model did not return tool_use' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      filters: toolUse.input,
      usage: response.usage,
    })
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error: ${error.message}` },
        { status: error.status ?? 500 }
      )
    }
    throw error
  }
}
