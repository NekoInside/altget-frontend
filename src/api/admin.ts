import { apiGet, apiPost, apiDelete } from './http'
import type {
  AdminStats, AdminTokenListResult, AdminUserDetail, AdminUserListResult, AdminUserSearchResult, TokenEntity,
} from '@/types/api'

export const getAdminStats = () => apiGet<AdminStats>('/admin/stats')

export const generateToken = (coinAmount: number) =>
  apiPost<TokenEntity>('/admin/token/generate', { coinAmount })

export const batchGenerateTokens = (coinAmount: number, count: number) =>
  apiPost<TokenEntity[]>(`/admin/token/batch-generate?count=${count}`, { coinAmount })

export const listTokens = (
  filter: 'all' | 'used' | 'unused' = 'all',
  page = 1,
  size = 20,
  keyword?: string,
) => apiGet<AdminTokenListResult>('/admin/token/list', { filter, page, size, keyword })

export const deleteToken = (tokenId: string) =>
  apiDelete<null>(`/admin/token/${tokenId}`)

export const adjustCoins = (userId: number, amount: number, reason: string) =>
  apiPost<null>('/admin/coins/adjust', { userId, amount, reason })

export const searchUsers = (keyword: string, page = 1, size = 20) =>
  apiGet<AdminUserListResult>('/admin/users/search', { keyword, page, size })

export const listUsers = (page = 1, size = 20) =>
  apiGet<AdminUserListResult>('/admin/users', { page, size })

export const getUserDetail = (userId: number) =>
  apiGet<AdminUserDetail>(`/admin/users/${userId}`)

export const banUser = (userId: number, reason?: string) => {
  const params = new URLSearchParams()
  if (reason?.trim()) params.set('reason', reason.trim())
  const query = params.toString()
  return apiPost<null>(`/admin/users/${userId}/ban${query ? `?${query}` : ''}`)
}

export const unbanUser = (userId: number) =>
  apiPost<null>(`/admin/users/${userId}/unban`)
