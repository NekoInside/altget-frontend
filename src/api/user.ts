import { apiGet, apiPost } from './http'
import type {
  UserInfo, CoinBalance, CoinHistoryResult, ApiResponse,
} from '@/types/api'

const normalizeUserInfo = (user: UserInfo): UserInfo => ({
  ...user,
  username: user.username ?? user.name ?? '',
  registerTime: user.registerTime ?? user.registrationTime ?? '',
  lastUseTime: user.lastUseTime ?? user.lastLoginTime ?? null,
  coinBalance: user.coinBalance ?? 0,
  githubBound: user.githubBound ?? false,
  telegramBound: user.telegramBound ?? false,
  discordBound: user.discordBound ?? false,
})

// ---- Auth ----
export const checkSession = async (): Promise<ApiResponse<null>> => ({
  code: localStorage.getItem('altget.auth.token') ? 0 : 401,
  msg: localStorage.getItem('altget.auth.token') ? 'success' : 'Unauthorized',
  data: null,
})

export const login = (username: string, ts: number, nonce: string) =>
  apiPost<string>('/auth/login', { username, ts, nonce })

export const getPasswordChallenge = (username: string) =>
  apiGet<{ challengeId: string; salt: string; serverPublicKey: string }>('/auth/password/challenge', { username })

export const verifyPasswordLogin = (sessionId: string, a: string, m1: string) =>
  apiPost<string | { token: string }>('/auth/password/token', { sessionId, a, m1 })

export const logout = async (): Promise<ApiResponse<null>> => {
  localStorage.removeItem('altget.auth.token')
  return { code: 0, msg: 'success', data: null }
}

export const register = (payload: {
  captchaId: string; captchaOutput: string; genTime: string; lotNumber: string; passToken: string
  username: string; email: string; salt: string; verifier: string
}) => apiPost<null>('/auth/register', payload)

export const forgotPassword = (payload: {
  captchaId: string; captchaOutput: string; genTime: string; lotNumber: string; passToken: string
  email: string
}) => apiPost<null>('/auth/forgot-password', payload)

export const resetPassword = (token: string, salt: string, verifier: string) =>
  apiPost<null>('/auth/reset-password', { token, salt, verifier })

export const activateAccount = (token: string) =>
  apiGet<null>('/auth/activate', { code: token })

// ---- Profile ----
export const getUserInfo = async () => {
  const res = await apiGet<UserInfo>('/user/self')
  if (res.code === 0 && res.data) res.data = normalizeUserInfo(res.data)
  return res
}

export const isAllowAnonymous = () => apiGet<string>('/user/is-allow-anonymous')

export const canBypassCaptcha = () => apiGet<string>('/user/can-bypass-captcha')

// ---- Social Bindings (OAuth redirects — just navigate to these URLs) ----
export const BIND_GITHUB_URL = '/api/auth/github?usage=bind'
export const LOGIN_GITHUB_URL = '/api/auth/github'
export const BIND_TG_URL = '/api/user/bind-tg'
export const BIND_DISCORD_URL = '/api/social/discord/redirect'

export const getGithubOAuthUsage = (state: string) => apiGet<'login' | 'bind'>('/auth/github/state', { state })

export const completeGithubLogin = (code: string, state: string) =>
  apiGet<string>('/auth/github/login', { code, state })

export const completeGithubBind = (code: string, state: string) =>
  apiGet<string>('/auth/github/bind', { code, state })

export const completeDiscordBind = (code: string) =>
  apiGet<string>('/social/discord/token', { code })

// ---- Coins ----
export const getCoinBalance = async (): Promise<ApiResponse<CoinBalance>> => {
  const res = await apiGet<number>('/coins/me')
  return {
    ...res,
    data: { balance: res.data ?? 0 },
  }
}

export const getCoinHistory = (page = 1, size = 20) =>
  apiGet<CoinHistoryResult>('/user/coins/history', { page, size })

export const redeemToken = (token: string): Promise<ApiResponse<null>> =>
  apiGet('/coins/redeem', { token })

export const transferCoins = (recipientUsername: string, amount: number): Promise<ApiResponse<CoinBalance>> =>
  apiPost('/user/coins/transfer', { recipientUsername, amount })
