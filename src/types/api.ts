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

// ---------- Used Alts ----------
export interface UsedAlt {
  id: number
  username: string
  password: string
  channel: string
  userId: number
  operationIp: string
  fetchMethod: string
  fetchTime: string
  createdAt?: string | null
}

export interface PageResponse<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}
