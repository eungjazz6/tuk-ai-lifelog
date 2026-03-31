export type Category = '소비' | '식단' | '운동' | '몸' | '일정' | '메모'

export type MoneyType = '지출' | '수입' | '저축·투자'

export type PaymentMethod = '현금' | '카드'

export type SubCategory =
  '식비' | '교통' | '쇼핑' | '건강비' | '구독' | '고정지출' | '기타지출' |
  '월급' | '부수입' | '용돈' | '환급' | '기타수입' |
  '적금' | '주식' | '코인' | '펀드' | '기타투자'

export type Action = 'create' | 'update' | 'delete' | 'query' | 'clarify'

export interface ParsedData {
  item: string
  value?: number
  unit?: string
  calories?: number
  datetime?: string
  notes?: string
}

export interface ParsedItem {
  category: Category
  parsedData: ParsedData
}

export interface Log {
  id: string
  timestamp: string
  category: Category
  sourceText: string
  parsedData: ParsedData
  isModified: boolean
  originalData?: ParsedData
  cycleId: string
  inputId?: string
  moneyType?: MoneyType
  subCategory?: SubCategory
  paymentMethod?: PaymentMethod
}

export interface ParseResult {
  action: Action
  category: Category
  parsedData: ParsedData
  items?: ParsedItem[]
  target?: 'last' | 'search'
  searchKeyword?: string
  queryIntent?: string
  feedback: string
  moneyType?: MoneyType
  subCategory?: SubCategory
  paymentMethod?: PaymentMethod
}

export const CATEGORY_META: Record<Category, { label: string; color: string; bg: string }> = {
  '소비': { label: '소비', color: '#D85A30', bg: '#FAECE7' },
  '식단': { label: '식단', color: '#1D9E75', bg: '#E1F5EE' },
  '운동': { label: '운동', color: '#185FA5', bg: '#E6F1FB' },
  '몸':   { label: '몸',   color: '#534AB7', bg: '#EEEDFE' },
  '일정': { label: '일정', color: '#BA7517', bg: '#FAEEDA' },
  '메모': { label: '메모', color: '#5F5E5A', bg: '#F1EFE8' },
}