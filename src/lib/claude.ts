import { GoogleGenerativeAI } from '@google/generative-ai'
import { Log, ParseResult } from './types'
import { getGeminiApiKey } from './storage'

function getClient() {
  const key = getGeminiApiKey()
  if (!key) throw new Error('Gemini API 키가 설정되지 않았어. 설정에서 입력해줘.')
  return new GoogleGenerativeAI(key)
}

const SYSTEM_PROMPT = `당신은 한국어 개인 기록 앱 "Tuk(툭)"의 AI 엔진입니다.
사용자 입력을 분석해 아래 액션 중 하나로 처리합니다.

## 액션 타입
- "create": 새로운 기록 생성
- "update": 기존 기록 수정
  - target "last": 직전 항목 수정 ("방금 거", "아니", "그거", "이거")
  - target "search": 키워드로 검색 후 수정 ("오늘 탕짜면 12000이었어")
- "delete": 기록 삭제 ("지워줘", "삭제해줘")
- "query": 내 데이터에 대한 질문 ("이번 달 얼마 썼어?", "계란 언제 샀지?")
- "clarify": 도저히 판단 불가할 때만 사용 (최대한 추론 먼저 시도)

## 일정 변경·이동 처리
"밀렸어", "옮겼어", "변경됐어", "바꼈어" 같은 표현은 action: "update", target: "search"로 처리.
- 새 요일/날짜 명시된 경우: 오늘 날짜(요일 포함) 기준으로 새 날짜를 직접 계산해 YYYY-MM-DD로 반환
  예) 오늘이 월요일이고 "담주 화욜로 밀렸어" → 다음 주 화요일 날짜 계산
- 새 날짜 없이 "담주로 밀렸어"만 있는 경우: 정확히 7일 뒤 날짜로 자동 계산 (같은 요일 다음 주)
- searchKeyword는 기존 일정명 (예: 이번주 토욜 약속 → "약속" 또는 구체적 일정명)

## 상대적 날짜 → ISO 변환 (오늘 날짜+요일 기준으로 직접 계산 후 YYYY-MM-DD 반환)
- 이번주 월/화/수/목/금/토/일요일 → 이번 주 해당 요일 날짜
- 담주/다음주 월/화/수/목/금/토/일요일 → 다음 주 해당 요일 날짜
- 내일 → 오늘+1일
- 모레 → 오늘+2일
- 다음달 N일 → 다음달 N일
항상 datetime 필드에 YYYY-MM-DD 형식으로 반환.

## 카테고리
- 소비: 지출, 결제, 구매, 수입, 투자 포함
- 식단: 먹은 음식, 음료, 식사
- 운동: 신체활동, 스포츠, 걸음수
- 몸: 몸무게, 수면, 컨디션, 신체 수치
- 일정: 약속, 할 일, 리마인더
- 메모: 위 카테고리에 해당하지 않는 모든 것

## 소비 카테고리 세부 분류
소비로 분류될 때 반드시 moneyType과 subCategory도 함께 반환.

### moneyType
- "지출": 돈이 나가는 것 (구매, 결제, 식비 등)
- "수입": 돈이 들어오는 것 (월급, 용돈, 환급 등)
- "저축·투자": 자산으로 이동하는 것 (적금, 주식, 코인 등)

### subCategory 분류 기준
지출:
- "식비": 외식, 배달, 카페, 장보기, 음식 관련 브랜드 (배떡, 맥도날드, 스타벅스 등)
- "교통": 택시, 버스, 지하철, 주유, 톨게이트
- "쇼핑": 옷, 생활용품, 전자기기, 쿠팡, 무신사 등
- "건강비": 병원, 약국, 헬스장, 의료비
- "구독": 넷플릭스, 유튜브 프리미엄, 스포티파이 등 정기결제
- "고정지출": 카드대금, 관리비, 보험료, 월세
- "기타지출": 위에 해당 안 되는 지출

수입:
- "월급": 월급, 급여, 알바비
- "부수입": 프리랜서, 판매수익 등
- "용돈": 용돈
- "환급": 세금환급, 캐시백, 포인트 환급
- "기타수입": 위에 해당 안 되는 수입

저축·투자:
- "적금": 적금, 예금
- "주식": 주식 매수/매도
- "코인": 암호화폐
- "펀드": 펀드, ETF
- "기타투자": 위에 해당 안 되는 투자

### paymentMethod (지출일 때만)
- "카드": 카드·체크카드·신용카드·앱결제·온라인결제·배달앱 등 (기본값, 명시 없으면 카드)
- "현금": "현금으로", "현금 결제", "현금", "cash" 등 현금 명시 시

## 복합 입력 처리 (핵심)
반드시 items 배열로만 반환. category와 parsedData를 최상위에 절대 쓰지 말 것.

### 여러 항목으로 쪼개야 하는 경우
- 음식 브랜드/음식명 + 금액 → 식단 항목 + 소비 항목
  ("배떡 이만원", "탕짜면 14000", "맥도날드 버거세트 9000")
- 운동 + 소비 → 운동 항목 + 소비 항목
  ("런닝 5km 편의점 5000", "헬스 1시간 프로틴 35000")
- 여러 활동 → 각각 항목으로
  ("런닝 5km 배떡 이만원" → 운동 + 식단 + 소비 세 항목)
- 여러 소비 → 각각 소비 항목으로
  ("배떡 오만넌 택시 오처넌" → 소비 두 항목, 배떡은 식단도 추가)

### 단일 항목인 경우도 items 배열로
- "배떡 먹음" → items: [{ category: "식단", ... }]
- "런닝 5km" → items: [{ category: "운동", ... }]
- "오늘 75.5" → items: [{ category: "몸", ... }]

### 음식 브랜드 인식
배떡, 요아정, 맥도날드, 버거킹, BBQ, 교촌, 스타벅스, 이디야, 빽다방,
롯데리아, KFC, 서브웨이, 도미노, 피자헛, 굽네, 노브랜드버거 등
→ 음식 브랜드 + 금액이면 반드시 식단 + 소비 두 항목으로 분리

## 단위 추론 (명시 없을 때)
- 1000 초과 숫자 → KRW
- 40~200 단독 숫자 → kg (몸 컨텍스트)
- 시간 맥락 숫자 → min 또는 hr
- 거리 맥락 숫자 → km
- 음식 관련 → kcal 자동 추정 (한국 음식 기준 상식적으로 추론)
- % 포함 → %

## 운동 칼로리 추정 (핵심)
운동(운동 카테고리) 항목은 반드시 calories 필드에 소모 칼로리를 추정해 기입.
체중 70kg 기준으로 상식적으로 추론:
- 러닝/달리기: km당 약 65kcal (예: 5km → 325kcal, 50km → 3250kcal)
- 걷기: km당 약 45kcal
- 자전거: km당 약 30kcal
- 헬스/웨이트: 시간당 약 300kcal
- 수영: 시간당 약 500kcal
- 기타 유산소: 분당 약 8kcal
명시된 수치가 없으면 활동명에서 추론.

## query 처리
질문 의도를 queryIntent에 간결하게 요약.
예: "이번 달 소비 합계 조회", "계란 키워드 검색", "오늘 칼로리 합계 조회"

## 응답 형식 (반드시 유효한 JSON만, 마크다운 없음)
항상 items 배열 사용. category/parsedData 최상위 사용 금지.

{
  "action": "create" | "update" | "delete" | "query" | "clarify",
  "items": [
    {
      "category": "소비" | "식단" | "운동" | "몸" | "일정" | "메모",
      "parsedData": {
        "item": "항목명",
        "value": 숫자 또는 null,
        "unit": "KRW" | "kg" | "km" | "min" | "hr" | "kcal" | "회" | "개" | "%" | null,
        "calories": 식단일 때 추정 kcal 또는 null,
        "datetime": "today" | "yesterday" | ISO날짜 | null,
        "notes": 추가정보 또는 null
      }
    }
  ],
  "moneyType": "지출" | "수입" | "저축·투자" | null,
  "subCategory": "식비" | "교통" | "쇼핑" | "건강비" | "구독" | "고정지출" | "기타지출" | "월급" | "부수입" | "용돈" | "환급" | "기타수입" | "적금" | "주식" | "코인" | "펀드" | "기타투자" | null,
  "paymentMethod": "카드" | "현금" | null,
  "target": "last" | "search" | null,
  "searchKeyword": "검색 키워드" | null,
  "queryIntent": "query일 때 의도 요약" | null,
  "feedback": "짧고 자연스러운 한국어 피드백 (최대 20자, 마침표 없음)"
}`

export async function parseInput(
  text: string,
  recentLogs: Log[]
): Promise<ParseResult> {
  const contextStr =
    recentLogs.length > 0
      ? `\n\n[최근 기록 (참고용)]\n` +
        recentLogs
          .slice(-5)
          .map(l => `- ${l.category}: ${l.parsedData.item} (${l.sourceText})`)
          .join('\n')
      : ''

  const today = new Date()
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  const todayStr = `오늘은 ${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${DOW[today.getDay()]}요일이야.`

  const model = getClient().getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  })

  const result = await model.generateContent(
    todayStr + '\n' + text + contextStr
  )
  const raw = result.response.text().trim()

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')

  const parsed = JSON.parse(jsonMatch[0])

  // 혹시 구형 형식으로 오면 items 배열로 정규화
  if (!parsed.items && parsed.category && parsed.parsedData) {
    parsed.items = [{ category: parsed.category, parsedData: parsed.parsedData }]
  }

  return parsed as ParseResult
}

const QUERY_PROMPT = `당신은 한국어 개인 기록 앱 "Tuk"의 AI입니다.
사용자의 전체 기록 데이터를 분석해 질문에 자연스러운 한국어로 답해주세요.

규칙:
- 기록이 있으면 날짜와 함께 구체적으로 답변 (예: "3월 25일에 소민이랑 만났어")
- 정확히 일치하는 기록이 없어도 관련 기록이 있으면 언급 (예: "계란 기록은 없는데 어제 마트 다녀온 기록이 있어")
- 관련 기록이 전혀 없으면 솔직히 없다고 (예: "소민이 관련 기록은 없어")
- 최대 2~3문장, 친근한 반말
- 마침표 없음`

export async function answerQuery(question: string, allLogs: Log[]): Promise<string> {
  if (allLogs.length === 0) return '아직 기록이 없어'

  const q = question.toLowerCase()
  const today = new Date()
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  const todayStr = `오늘은 ${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${DOW[today.getDay()]}요일이야.`

  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
  const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
  const getWeekRange = (d: Date) => {
    const day = d.getDay()
    const diffToMon = day === 0 ? -6 : 1 - day
    const mon = startOfDay(new Date(d))
    mon.setDate(d.getDate() + diffToMon)
    const sun = endOfDay(new Date(mon))
    sun.setDate(mon.getDate() + 6)
    return { start: mon, end: sun }
  }
  const getMonthRange = (d: Date) => {
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }
  const itemDate = (l: Log) => {
    if (l.parsedData.datetime) {
      const dt = new Date(`${l.parsedData.datetime}T12:00:00`)
      if (!isNaN(dt.getTime())) return dt
    }
    return new Date(l.timestamp)
  }

  const week = getWeekRange(today)
  const month = getMonthRange(today)
  const lastMonthDate = new Date(today)
  lastMonthDate.setMonth(today.getMonth() - 1)
  const lastMonth = getMonthRange(lastMonthDate)

  const isInRange = (d: Date, range: { start: Date; end: Date }) => d >= range.start && d <= range.end

  const consume = (logs: Log[]) => logs.reduce((s, l) => s + (typeof l.parsedData.value === 'number' ? l.parsedData.value : 0), 0)

  const foodLogs = allLogs.filter(l => l.category === '식단')
  const expenseLogs = allLogs.filter(l => l.category === '소비' && l.moneyType === '지출')
  const exerciseLogs = allLogs.filter(l => l.category === '운동')
  const bodyLogs = allLogs.filter(l => l.category === '몸' && typeof l.parsedData.value === 'number')
  const scheduleLogs = allLogs.filter(l => l.category === '일정')

  // 1) 이번 달 카페 지출
  if (q.includes('이번 달 카페') || q.includes('이번달 카페')) {
    const cafe = expenseLogs.filter(l => ((l.parsedData.item ?? '').toString().toLowerCase().includes('카페') || (l.sourceText ?? '').toString().toLowerCase().includes('카페')) && isInRange(new Date(l.timestamp), month))
    const total = consume(cafe)
    return `이번 달 카페 지출은 ${total.toLocaleString()}원 이었어`
  }

  // 2) 지난달 대비 지출 비교
  if (q.includes('지난달이랑 비교') || q.includes('지난달이랑') && q.includes('비교')) {
    const thisMonthEx = expenseLogs.filter(l => isInRange(new Date(l.timestamp), month))
    const lastMonthEx = expenseLogs.filter(l => isInRange(new Date(l.timestamp), lastMonth))
    const tM = consume(thisMonthEx)
    const lM = consume(lastMonthEx)
    if (lM === 0) return `지난달 기록이 없어서 비교하기 어렵지만, 이번 달은 ${tM.toLocaleString()}원 썼어`
    const diff = tM - lM
    const pct = Math.round((Math.abs(diff) / lM) * 100)
    return diff > 0 ? `지난달보다 ${pct}% 더 많이 썼어` : diff < 0 ? `지난달보다 ${pct}% 적게 썼어` : '지난달이랑 거의 같아'
  }

  // 3) 요즘 배달 자주 시키냐
  if (q.includes('요즘 배달') || q.includes('배달 자주')) {
    const recentDays = 30
    const dateFrom = new Date(today)
    dateFrom.setDate(today.getDate() - recentDays)
    const dela = expenseLogs.filter(l => (l.sourceText ?? '').toString().toLowerCase().includes('배달') || (l.parsedData.item ?? '').toString().toLowerCase().includes('배달'))
      .filter(l => new Date(l.timestamp) >= dateFrom)
    if (dela.length >= 7) return `최근 한 달에 배달을 꽤 자주 시켰어 (${dela.length}회)`
    if (dela.length >= 3) return `요즘 배달이 좀 자주 보이긴 해 (${dela.length}회)`
    return `배달 기록이 많진 않아 (${dela.length}회)`
  }

  // 4) 이번 주 지출 최다 항목
  if (q.includes('이번 주') && q.includes('뭐에 제일 많이 썼어')) {
    const weekExpenses = expenseLogs.filter(l => isInRange(new Date(l.timestamp), week))
    const map: Record<string, number> = {}
    weekExpenses.forEach(l => {
      const key = (l.subCategory ?? l.parsedData.item ?? '기타').toString()
      map[key] = (map[key] || 0) + (typeof l.parsedData.value === 'number' ? l.parsedData.value : 0)
    })
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) return '이번 주 지출 기록이 없네'
    return `이번 주에는 ${entries[0][0]}에 제일 많이 썼어 (${entries[0][1].toLocaleString()}원)`
  }

  // 5) 치킨 마지막 주문
  if (q.includes('치킨') && q.includes('마지막')) {
    const chicken = expenseLogs.filter(l => ((l.parsedData.item ?? '').toString().toLowerCase().includes('치킨') || (l.sourceText ?? '').toString().toLowerCase().includes('치킨')))
    if (chicken.length === 0) return '치킨 주문 기록이 없어'
    const last = chicken.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    const d = new Date(last.timestamp)
    return `${d.getMonth() + 1}월 ${d.getDate()}일에 치킨을 마지막으로 시켰어`
  }

  // 6) 이번 달 고정지출 제외 남은 지출
  if (q.includes('이번 달 고정지출') && q.includes('빼면') && q.includes('얼마')) {
    const thisMonth = expenseLogs.filter(l => isInRange(new Date(l.timestamp), month))
    const fixed = thisMonth.filter(l => l.subCategory === '고정지출')
    const total = consume(thisMonth)
    const fixTotal = consume(fixed)
    const remain = total - fixTotal
    return `이번 달 고정지출 빼면 ${remain.toLocaleString()}원 남아`
  }

  // 식단: 7번. 오늘 칼로리
  if (q.includes('오늘 칼로리')) {
    const todayDiet = foodLogs.filter(l => {
      const d = itemDate(l)
      return isInRange(d, { start: startOfDay(today), end: endOfDay(today) })
    })
    const total = todayDiet.reduce((s, l) => s + (typeof l.parsedData.calories === 'number' ? l.parsedData.calories : 0), 0)
    return `오늘 섭취 칼로리는 총 ${total}kcal` 
  }

  // 식단: 8번. 이번 주 가장 많이 먹은 항목
  if (q.includes('이번 주') && q.includes('제일 많이 먹었어')) {
    const thisWeekDiet = foodLogs.filter(l => isInRange(itemDate(l), week))
    const map: Record<string, number> = {}
    thisWeekDiet.forEach(l => {
      const it = (l.parsedData.item ?? '알 수 없는').toString()
      map[it] = (map[it] || 0) + (typeof l.parsedData.calories === 'number' ? l.parsedData.calories : 1)
    })
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) return '이번 주 식단 기록이 없어'
    return `이번 주에는 ${entries[0][0]}을(를) 가장 많이 먹었어` 
  }

  // 식단: 9번. 야식 자주 먹는지
  if ((q.includes('야식') && q.includes('자주')) || (q.includes('요즘') && q.includes('야식'))) {
    const recent24 = new Date(today); recent24.setDate(today.getDate() - 14)
    const lateMeals = foodLogs.filter(l => itemDate(l) >= recent24 && (l.parsedData.item ?? '').toString().toLowerCase().includes('야식'))
    if (lateMeals.length >= 5) return '요즘 야식을 많이 먹는 편이야'
    if (lateMeals.length >= 2) return '야식을 가끔 먹고 있어'
    return '야식을 잘 안 먹는 편이야'
  }

  // 식단: 10번. 라면 마지막
  if (q.includes('라면') && q.includes('마지막')) {
    const ramen = foodLogs.filter(l => (l.parsedData.item ?? '').toString().toLowerCase().includes('라면') || (l.sourceText ?? '').toString().toLowerCase().includes('라면'))
    if (ramen.length === 0) return '라면 기록이 없어'
    const last = ramen.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    const d = itemDate(last)
    return `${d.getMonth() + 1}월 ${d.getDate()}일에 라면을 마지막으로 먹었어`
  }

  // 식단: 11번. 이번 주 평균 칼로리
  if (q.includes('이번 주') && q.includes('평균 칼로리')) {
    const thisWeekDiet = foodLogs.filter(l => isInRange(itemDate(l), week))
    if (thisWeekDiet.length === 0) return '이번 주 식단 기록이 없어'
    const total = thisWeekDiet.reduce((s, l) => s + (typeof l.parsedData.calories === 'number' ? l.parsedData.calories : 0), 0)
    const days = new Set(thisWeekDiet.map(l => itemDate(l).toDateString())).size || 1
    const avg = Math.round(total / days)
    return `이번 주 하루 평균 칼로리는 약 ${avg}kcal` 
  }

  // 식단+운동: 오늘 먹은 것으로 운동 추천
  if ((q.includes('오늘') || q.includes('요즘')) && q.includes('운동') && (q.includes('얼마나') || q.includes('해야'))) {
    const todayDiet = foodLogs.filter(l => isInRange(itemDate(l), { start: startOfDay(today), end: endOfDay(today) }))
    const totalCalories = todayDiet.reduce((s, l) => s + (typeof l.parsedData.calories === 'number' ? l.parsedData.calories : 0), 0)
    if (totalCalories > 0) {
      const runKcalPerKm = 65
      const runKm = Math.ceil(totalCalories / runKcalPerKm)
      return `오늘 ${totalCalories}kcal를 섭취했으니, 런닝으로 약 ${runKm}km 정도 소모하면 좋아`
    }
    // 기록이 없어도 질문에 음식 언급이 있을 수 있어서 AI 폴백으로 넘김
  }

  // 운동: 12번. 이번 달 운동 며칠
  if (q.includes('이번 달') && q.includes('운동') && q.includes('며칠')) {
    const thisMonthEx = exerciseLogs.filter(l => isInRange(itemDate(l), month))
    const days = new Set(thisMonthEx.map(l => itemDate(l).toDateString())).size
    return `이번 달 운동한 날은 ${days}일이야`
  }

  // 운동: 13번. 런닝 마지막
  if (q.includes('런닝') && q.includes('마지막')) {
    const run = exerciseLogs.filter(l => (l.parsedData.item ?? '').toString().toLowerCase().includes('런닝') || (l.parsedData.item ?? '').toString().toLowerCase().includes('달리기') || (l.sourceText ?? '').toString().toLowerCase().includes('런닝') || (l.sourceText ?? '').toString().toLowerCase().includes('달리기'))
    if (run.length === 0) return '런닝 기록이 없어'
    const last = run.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    const d = itemDate(last)
    return `${d.getMonth() + 1}월 ${d.getDate()}일에 런닝했어`
  }

  // 운동: 14번. 지난주 vs 이번주 운동량
  if (q.includes('지난주') && q.includes('이번 주') && q.includes('운동량')) {
    const lastWeekStart = new Date(week.start); lastWeekStart.setDate(week.start.getDate() - 7)
    const lastWeekEnd = new Date(week.end); lastWeekEnd.setDate(week.end.getDate() - 7)
    const lastWeek = { start: lastWeekStart, end: lastWeekEnd }
    const lastCal = exerciseLogs.filter(l => isInRange(itemDate(l), lastWeek)).reduce((s, l) => s + (typeof l.parsedData.calories === 'number' ? l.parsedData.calories : 0), 0)
    const currentCal = exerciseLogs.filter(l => isInRange(itemDate(l), week)).reduce((s, l) => s + (typeof l.parsedData.calories === 'number' ? l.parsedData.calories : 0), 0)
    if (lastCal === 0) return `지난주 운동 기록이 부족해, 이번 주는 ${currentCal}kcal 소모했어`
    const diff = currentCal - lastCal
    return diff > 0 ? `이번 주가 지난주보다 ${Math.round(diff)}kcal 더 많이 소모했어` : diff < 0 ? `지난주보다 ${Math.round(-diff)}kcal 적게 소모했어` : '이번 주와 지난주의 운동량이 비슷해'
  }

  // 운동: 15번. 꾸준히 운동하냐
  if (q.includes('꾸준히 운동') || q.includes('꾸준히') && q.includes('운동')) {
    const months = 3
    const fromDate = new Date(today); fromDate.setMonth(today.getMonth() - months)
    const dates = new Set(exerciseLogs.filter(l => itemDate(l) >= fromDate).map(l => itemDate(l).toDateString()))
    if (dates.size >= 9) return '꾸준히 하고 있는 편이야'
    if (dates.size >= 4) return '가끔씩은 하고 있어'
    return '좀 더 자주 해보자'
  }

  // 몸: 살쪘지/과식 기존 유지 (16번)
  if (q.includes('살왜') || q.includes('살쪘') || q.includes('과식')) {
    const bingeLogs = allLogs
      .filter(l => l.category === '식단' && typeof l.parsedData.calories === 'number' && l.parsedData.calories >= 900)
      .map(l => ({ date: itemDate(l), calories: l.parsedData.calories ?? 0 }))
      .sort((a, b) => b.calories - a.calories)
    if (bingeLogs.length === 0) {
      return '최근 과식 증거가 잘 안 보여서, 기록을 조금 더 적어봐'
    }
    const top = bingeLogs[0]
    const dateText = `${top.date.getMonth() + 1}월 ${top.date.getDate()}일`
    return `${dateText}에 과식한 기록이 가장 많아 보여요`
  }

  // 몸: 몸무게 늘기 시작
  if (q.includes('몸무게') && q.includes('늘기 시작')) {
    const sorted = bodyLogs
      .filter(l => l.parsedData.unit === 'kg' || l.parsedData.unit === 'kg')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    if (sorted.length < 2) return '몸무게 기록이 부족해'
    let startDate = sorted[0]
    for (let i = 1; i < sorted.length; i++) {
      if ((sorted[i].parsedData.value ?? 0) > (sorted[i - 1].parsedData.value ?? 0)) {
        startDate = sorted[i]
        break
      }
    }
    const d = itemDate(startDate)
    return `${d.getMonth() + 1}월 ${d.getDate()}일쯤부터 늘기 시작했어`
  }

  // 몸: 가장 가벼웠던 날
  if (q.includes('가장 가벼웠던') || q.includes('제일 가벼웠던')) {
    if (bodyLogs.length === 0) return '몸무게 기록이 없어'
    const min = bodyLogs.reduce((low, l) => (l.parsedData.value ?? 0) < (low.parsedData.value ?? 9999) ? l : low, bodyLogs[0])
    const d = itemDate(min)
    return `${d.getMonth() + 1}월 ${d.getDate()}일에 제일 가벼웠어`
  }

  // 몸: 이번 달 몸무게 변화
  if (q.includes('이번 달') && q.includes('몸무게') && q.includes('변화')) {
    const monthBody = bodyLogs.filter(l => isInRange(itemDate(l), month)).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    if (monthBody.length < 2) return '이번 달 몸무게 기록이 충분하지 않아'
    const first = monthBody[0].parsedData.value ?? 0
    const last = monthBody[monthBody.length - 1].parsedData.value ?? 0
    const diff = last - first
    return diff > 0 ? `이번 달에 ${diff.toFixed(1)}kg 늘었어` : diff < 0 ? `이번 달에 ${Math.abs(diff).toFixed(1)}kg 줄었어` : '이번 달에는 변화가 거의 없어'
  }

  // 크로스: 스트레스+배달
  if (q.includes('스트레스') && q.includes('배달')) {
    const stressDays = new Set(scheduleLogs.filter(l => (l.sourceText ?? '').toString().toLowerCase().includes('스트레스') || (l.parsedData.item ?? '').toString().toLowerCase().includes('스트레스')).map(l => itemDate(l).toDateString()))
    if (stressDays.size === 0) return '스트레스 일정이 기록되어 있지 않아'
    const deliveryOnStress = expenseLogs.filter(l => isInRange(itemDate(l), { start: new Date(0), end: today }) && ((l.sourceText ?? '').toString().toLowerCase().includes('배달') || (l.parsedData.item ?? '').toString().toLowerCase().includes('배달')) && stressDays.has(itemDate(l).toDateString()))
    return deliveryOnStress.length > 0 ? '스트레스 받는 날에 배달을 더 시킨 편이야' : '스트레스 받는 날에 배달이 많진 않네'
  }

  // 크로스: 운동한/안한 날 칼로리 차이
  if (q.includes('운동한 날') && q.includes('칼로리')) {
    const exerciseDays = new Set(exerciseLogs.map(l => itemDate(l).toDateString()))
    const dietByDate: Record<string, number> = {}
    foodLogs.forEach(l => {
      const d = itemDate(l).toDateString()
      dietByDate[d] = (dietByDate[d] || 0) + (typeof l.parsedData.calories === 'number' ? l.parsedData.calories : 0)
    })
    const withEx = Object.entries(dietByDate).filter(([d]) => exerciseDays.has(d)).map(([, kcal]) => kcal)
    const withoutEx = Object.entries(dietByDate).filter(([d]) => !exerciseDays.has(d)).map(([, kcal]) => kcal)
    const avgWith = withEx.length ? Math.round(withEx.reduce((a, b) => a + b, 0) / withEx.length) : 0
    const avgWithout = withoutEx.length ? Math.round(withoutEx.reduce((a, b) => a + b, 0) / withoutEx.length) : 0
    return `운동한 날 평균 ${avgWith}kcal, 안 한 날 평균 ${avgWithout}kcal 이네`
  }

  // 크로스: 월급날 이후 소비
  if (q.includes('월급') && q.includes('이후') && q.includes('얼마')) {
    const pay = allLogs.filter(l => (l.parsedData.item ?? '').toString().toLowerCase().includes('월급') || l.subCategory === '월급')
    if (pay.length === 0) return '월급 기록을 찾을 수 없어'
    const lastPay = pay.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    const expenditure = expenseLogs.filter(l => new Date(l.timestamp) > new Date(lastPay.timestamp))
    const total = consume(expenditure)
    return `월급 후에 ${total.toLocaleString()}원 썼어`
  }

  // 크로스: 이번 주 가장 바쁜 날 뭐 먹었어
  if (q.includes('가장 바빴던 날') && q.includes('뭐 먹었어')) {
    const scheduleByDate: Record<string, number> = {}
    scheduleLogs.forEach(l => {
      const d = itemDate(l).toDateString()
      scheduleByDate[d] = (scheduleByDate[d] || 0) + 1
    })
    const busiest = Object.entries(scheduleByDate).sort((a, b) => b[1] - a[1])[0]
    if (!busiest) return '일정 기록이 없어'
    const busyDate = busiest[0]
    const foods = foodLogs.filter(l => itemDate(l).toDateString() === busyDate).map(l => (l.parsedData.item ?? '').toString())
    if (foods.length === 0) return `${busyDate}에 일정은 많았지만 식단 기록은 없어`
    return `${busyDate}에 ${foods.join(', ')} 먹었어`
  }

  // 기존 fallback: AI 모델 응답
  const logsStr = allLogs
    .slice(-200)
    .map(l => {
      const d = new Date(l.timestamp)
      const dateLabel = `${d.getMonth() + 1}월 ${d.getDate()}일`
      const val = l.parsedData.value != null ? ` (${l.parsedData.value}${l.parsedData.unit ?? ''})` : ''
      const notes = l.parsedData.notes ? ` [${l.parsedData.notes}]` : ''
      return `[${dateLabel}] ${l.category} - ${l.parsedData.item}${val}${notes} / 원문: "${l.sourceText}"`
    })
    .join('\n')

  const model = getClient().getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: QUERY_PROMPT,
  })

  const result = await model.generateContent(
    `${todayStr}\n\n[전체 기록]\n${logsStr}\n\n[질문]\n${question}`
  )
  return result.response.text().trim()
}