// Vercel 서버리스 함수: GET /api/generate?style=delivery
// 환경변수 ANTHROPIC_API_KEY 가 필요하다.
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const STYLE_HINTS = {
  delivery: '택배 배송 안내 문자',
  prize: '이벤트 당첨 안내 문자',
  payment: '카드 결제 승인 알림 문자',
  subsidy: '정부 지원금 안내 문자',
  fine: '과태료·미납 고지 문자',
  stock: '주식 리딩방 홍보 문자',
  invite: '모바일 초대장 문자',
}

const SYSTEM = `너는 "추석성 스팸문자" 사이트의 문구 생성기다.
스팸·피싱 문자의 말투를 패러디해서, 실제 내용은 따뜻한 추석 인사가 되는 짧은 문자를 쓴다.

규칙:
- 3~4줄, 전체 120자 이내.
- 마지막 줄은 반드시 " >> {링크}" 로 끝난다. {링크}는 그대로 둔다.
- 스팸 특유의 과장(!!, [대괄호 머리말], 긴급함)을 살리되, 내용은 송편·보름달·가족·건강·행복 같은 추석 인사.
- 실존 기업·기관·은행·택배사 이름, 전화번호, 계좌번호, 금액 송금 요구는 절대 넣지 않는다.
- "[Web발신]"은 쓰지 않는다(화면에서 따로 붙인다).
- 문자 본문만 출력한다. 설명이나 따옴표는 쓰지 않는다.`

export default async function handler(req, res) {
  const style = STYLE_HINTS[req.query.style] ? req.query.style : 'delivery'

  try {
    const response = await client.beta.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-5',
      max_tokens: 2000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `${STYLE_HINTS[style]} 느낌으로 하나 만들어줘. 매번 새로운 드립으로. (seed ${Math.random().toString(36).slice(2, 8)})`,
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      return res.status(502).json({ error: 'refused' })
    }

    let text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    if (!text) return res.status(502).json({ error: 'empty' })
    if (!text.includes('{링크}')) text += ' >> {링크}'

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ text, source: 'ai' })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'rate_limited' })
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`API error ${error.status}:`, error.message)
      return res.status(502).json({ error: 'api_error' })
    }
    console.error(error)
    return res.status(500).json({ error: 'server_error' })
  }
}
