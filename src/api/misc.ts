import { apiGet, apiPost, getAuthHeaders } from './http'
import type { Announcement, StatusData, PowTask, PasskeyItem } from '@/types/api'

// ---- Announcements ----
export const getAnnouncements = () => apiGet<Announcement[]>('/announce')

// ---- Status ----
export const getStatus = () => apiGet<StatusData>('/status')

// ---- PoW ----
export type PowTarget = 'register' | 'forgot-password' | 'new-key' | 'fetch' | 'login'
export const getPowTask = (target: PowTarget) =>
  apiGet<PowTask>('/pow', { target })

// ---- Convert SAuth ----
export const convertSauth = (username: string, password: string) =>
  apiGet<string>('/alt/convert/sauth', { username, password })

// ---- Passkeys ----
export const getPasskeyRegisterOptions = () =>
  apiPost<{ challengeId: string; options: string }>('/auth/passkey/register/options')

export const verifyPasskeyRegister = (challengeId: string, credential: string, name?: string) =>
  apiPost<null>('/auth/passkey/register/verify', { challengeId, credential, name: name ?? 'My Passkey' })

export const getPasskeyLoginOptions = (username?: string) =>
  apiPost<{ challengeId: string; options: unknown }>('/auth/passkey/login/options', username ? { username } : {})

export const verifyPasskeyLogin = (challengeId: string, credential: string) =>
  apiPost<string>('/auth/passkey/login/verify', { challengeId, credential })

export const listPasskeys = () => apiGet<PasskeyItem[]>('/auth/passkey/list')

export const deletePasskey = (id: number) => {
  return fetch(`/api/auth/passkey/${id}`, { method: 'DELETE', credentials: 'include', headers: getAuthHeaders() }).then(r => r.json())
}
