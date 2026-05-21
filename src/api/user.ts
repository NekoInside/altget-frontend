import { apiGet, apiPost } from './http'
import type {
  UserInfo, CoinBalance, CoinHistoryResult, ApiResponse,
} from '@/types/api'

// ---- Auth ----
export const checkSession = () => apiGet<null>('/user/check')

export const login = (username: string, ts: number, nonce: string) =>
  apiPost<null>('/user/login', { username, ts, nonce })

export const logout = () => apiGet<null>('/user/logout')

export const register = (payload: {
  powId: string; nonce: string
  captchaId: string; captchaOutput: string; genTime: string; lotNumber: string; passToken: string
  username: string; email: string; password: string
}) => apiPost<null>('/user/register', payload)

export const forgotPassword = (payload: {
  powId: string; nonce: string
  captchaId: string; captchaOutput: string; genTime: string; lotNumber: string; passToken: string
  email: string
}) => apiPost<null>('/user/forgot-password', payload)

export const resetPassword = (token: string, password: string) =>
  apiPost<null>('/user/reset-password', { token, password })

export const activateAccount = (token: string) =>
  apiGet<null>('/user/activate', { token })

// ---- Profile ----
export const getUserInfo = () => apiGet<UserInfo>('/user/info')

export const isAllowAnonymous = () => apiGet<string>('/user/is-allow-anonymous')

export const canBypassCaptcha = () => apiGet<string>('/user/can-bypass-captcha')

// ---- Social Bindings (OAuth redirects — just navigate to these URLs) ----
export const BIND_GITHUB_URL = '/api/user/bind-github'
export const LOGIN_GITHUB_URL = '/api/user/login-with-github'
export const BIND_TG_URL = '/api/user/bind-tg'
export const BIND_DISCORD_URL = '/api/discord/bind'

// ---- Coins ----
export const getCoinBalance = () => apiGet<CoinBalance>('/user/coins/balance')

export const getCoinHistory = (page = 1, size = 20) =>
  apiGet<CoinHistoryResult>('/user/coins/history', { page, size })

export const redeemToken = (token: string): Promise<ApiResponse<CoinBalance>> =>
  apiPost('/user/redeem-token', { token })

export const transferCoins = (recipientUsername: string, amount: number): Promise<ApiResponse<CoinBalance>> =>
  apiPost('/user/coins/transfer', { recipientUsername, amount })
