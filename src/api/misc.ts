import { apiGet, apiPost, apiDelete } from './http'
import type { PowTask, PasskeyItem } from '@/types/api'

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

export const deletePasskey = (id: number) => apiDelete(`/auth/passkey/${id}`)
