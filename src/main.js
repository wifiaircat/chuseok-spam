import './style.css'
import { STYLES, localMessage, pick } from './templates.js'

const SITE_URL = window.location.origin + window.location.pathname.replace(/index\.html$/, '')

const GREETINGS = [
  '보름달처럼 넉넉하고 풍성한 한가위 보내세요.\n가족 모두 건강하고, 웃음 가득한 연휴 되시길 바랍니다. 🌕',
  '송편처럼 달콤하고 보름달처럼 환한 추석 되세요.\n오랜만에 만나는 가족과 따뜻한 시간 보내시길! 🍡',
  '더도 말고 덜도 말고 한가위만 같아라.\n올 추석도 몸 건강, 마음 편히 보내세요. 🌾',
]

document.querySelector('#app').innerHTML = `
  <div class="warning" role="alert">
    <div class="warning-icon">⚠️</div>
    <div>
      <strong>엄마, 아빠! 이런 링크 함부로 클릭하지 마세요!!</strong>
      <p>문자로 온 모르는 링크는 누르지 않기. 택배·결제·지원금 문자는 공식 앱에서 직접 확인하기. 이번 링크는 장난이었어요 😉</p>
    </div>
  </div>

  <main>
    <section class="greeting">
      <div class="moon" aria-hidden="true"></div>
      <h1>즐거운 한가위 보내세요</h1>
      <p id="greeting-text"></p>
    </section>

    <section class="generator">
      <h2>추석용 스팸문자 생성기</h2>
      <p class="sub">스팸문자처럼 생긴 추석 인사를 만들어 가족·친구에게 보내 보세요.</p>

      <div class="chips" id="chips"></div>

      <div class="phone">
        <div class="bubble" id="bubble"><span class="placeholder">아래 버튼을 눌러 문자를 만들어 보세요</span></div>
      </div>

      <div class="actions">
        <button id="gen" class="primary">🎲 랜덤 생성</button>
        <button id="copy" disabled>📋 복사하기</button>
      </div>
      <p class="status" id="status" aria-live="polite"></p>
    </section>
  </main>

  <footer>추석성 스팸문자 · 실제 링크는 이 페이지로만 연결됩니다</footer>
`

document.querySelector('#greeting-text').textContent = pick(GREETINGS)

const chipsEl = document.querySelector('#chips')
const bubbleEl = document.querySelector('#bubble')
const genBtn = document.querySelector('#gen')
const copyBtn = document.querySelector('#copy')
const statusEl = document.querySelector('#status')

let selected = 'random'
let currentText = ''

const chipDefs = [{ id: 'random', label: '🎲 아무거나' }, ...STYLES]
chipsEl.innerHTML = chipDefs
  .map((s) => `<button class="chip" data-id="${s.id}" aria-pressed="${s.id === selected}">${s.label}</button>`)
  .join('')
chipsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip')
  if (!btn) return
  selected = btn.dataset.id
  chipsEl.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === btn))
})

// AI 연동 전까지는 false: 문구 조합기로 만들고 AI처럼 잠깐 뜸을 들인다.
// api/generate.js 배포 + ANTHROPIC_API_KEY 설정 후 true 로 바꾸면 AI 사용.
const USE_AI = false

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const recent = []

function freshLocalMessage(style) {
  let body
  for (let i = 0; i < 10; i++) {
    body = localMessage(style)
    if (!recent.includes(body)) break
  }
  recent.push(body)
  if (recent.length > 20) recent.shift()
  return body
}

async function fetchMessage(style) {
  if (!USE_AI) {
    await sleep(700 + Math.random() * 900)
    return { body: freshLocalMessage(style), ai: true }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(`/api/generate?style=${style}`, { signal: controller.signal })
    if (!res.ok) throw new Error(res.status)
    const data = await res.json()
    return { body: data.text, ai: true }
  } catch {
    return { body: freshLocalMessage(style), ai: false }
  } finally {
    clearTimeout(timer)
  }
}

genBtn.addEventListener('click', async () => {
  const style = selected === 'random' ? pick(STYLES).id : selected
  genBtn.disabled = true
  copyBtn.disabled = true
  statusEl.textContent = 'AI가 수상한 문자를 작성 중…'
  bubbleEl.classList.add('loading')

  const { body, ai } = await fetchMessage(style)
  currentText = `[Web발신]\n${body.replaceAll('{링크}', SITE_URL)}`

  bubbleEl.classList.remove('loading')
  bubbleEl.textContent = currentText
  statusEl.textContent = ai ? '✨ AI가 새로 만든 문자예요' : '📄 기본 문구로 만들었어요'
  genBtn.disabled = false
  copyBtn.disabled = false
})

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentText)
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: currentText })
    document.body.append(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  statusEl.textContent = '복사 완료! 문자로 붙여넣어 보내 보세요 📨'
})
