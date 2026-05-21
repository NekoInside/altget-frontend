import { apiGet, apiPost } from './http'
import type { ApiKeyInfo } from '@/types/api'

export const getApiKeyInfo = () => apiGet<ApiKeyInfo>('/uf/info')

export const generateNewApiKey = (captchaPayload: {
  powId: string; nonce: string
  captchaId: string; captchaOutput: string; genTime: string; lotNumber: string; passToken: string
}) => apiPost<string>('/uf/new-key', captchaPayload)

// For direct API usage: GET /api/uf/get with header x-ciallo: {apiKey}
// This is done client-side via fetch with custom headers
export const fetchAltWithApiKey = async (apiKey: string): Promise<string> => {
  const res = await fetch('/api/uf/get', {
    headers: { 'x-ciallo': apiKey },
  })
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.msg)
  return json.data as string
}

// Paid API fetch: GET /api/uf/paid-get?amount={amount} with header x-ciallo: {apiKey}
// Billing type: PAID_USER_API_FETCH
export const fetchPaidAltWithApiKey = async (apiKey: string, amount?: number): Promise<string> => {
  const params = new URLSearchParams()
  if (typeof amount === 'number' && !Number.isNaN(amount)) {
    params.set('amount', String(amount))
  }
  const query = params.toString()
  const res = await fetch(`/api/uf/paid-get${query ? `?${query}` : ''}`, {
    headers: { 'x-ciallo': apiKey },
  })
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.msg)
  return json.data as string
}
