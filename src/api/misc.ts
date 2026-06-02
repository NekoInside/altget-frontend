import { apiGet, apiPost, getAuthHeaders } from './http'
import type { Announcement, StatusData, PowTask, ConvertResult, PasskeyItem } from '@/types/api'

// ---- Announcements ----
export const getAnnouncements = () => apiGet<Announcement[]>('/announce')

// ---- Status ----
export const getStatus = () => apiGet<StatusData>('/status')

// ---- PoW ----
export type PowTarget = 'register' | 'forgot-password' | 'new-key' | 'fetch' | 'convert' | 'login'
export const getPowTask = (target: PowTarget) =>
  apiGet<PowTask>('/pow', { target })

// ---- Convert ----
export const submitConvertRequest = (payload: {
  username: string; password: string; id: string; n: string
}) => apiPost<ConvertResult>('/convert/post-request', payload)

export const getConvertResult = (taskId: string) =>
  apiGet<ConvertResult>(`/convert/get-result/${taskId}`)

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
