// ============================================================
// Shared API types for altget-backend
// ============================================================

export interface ApiResponse<T = null> {
  code: number
  msg: string
  message?: string
  data: T
}

// ---------- User ----------
export interface UserInfo {
  id?: number
  name?: string
  username: string
  email: string
  registrationTime?: string
  registerTime: string
  lastLoginTime?: string
  lastUseTime: string | null
  coinBalance: number
  githubBound: boolean
  telegramBound: boolean
  discordBound: boolean
  role?: number
}

// ---------- Coins ----------
export interface CoinBalance {
  balance: number
}

export interface CoinTransaction {
  id: number
  userId: number
  amount: number
  transactionType: string
  relatedTokenId: string | null
  description: string
  createdAt: string
}

export interface CoinHistoryResult {
  transactions: CoinTransaction[]
  total: number
  pages: number
}

// ---------- API Key ----------
export interface ApiKeyInfo {
  apiKey?: string
  key: string
  limitLevel?: number | string
  dailyUsage: number
  userTier: number
  limitTime: number
}

// ---------- Announcement ----------
export interface Announcement {
  id: number
  type: 1 | 2
  context: string
}

// ---------- Status ----------
export interface StatusData {
  last1mGetCount: number
  last5mGetCount: number
  last15mGetCount: number
  last1mAverageRequestTime: number
  last5mAverageRequestTime: number
  last15mAverageRequestTime: number
}

// ---------- Passkey ----------
export interface PasskeyItem {
  id: number
  name: string
  createdAt: string
}

// ---------- PoW ----------
export interface PowTask {
  taskId: string
  data: string
  difficulty: number
  target: string
  isWasmTask: boolean
  createTime: string
}
