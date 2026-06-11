import { apiGet, apiPost } from './http'
import type { ApiKeyInfo } from '@/types/api'
import { getApiMessage } from '@/utils/apiMessage'

const normalizeApiKeyInfo = (info: ApiKeyInfo): ApiKeyInfo => ({
  ...info,
  key: info.key ?? info.apiKey ?? '',
  userTier: info.userTier ?? (typeof info.limitLevel === 'number' ? info.limitLevel : 0),
  dailyUsage: info.dailyUsage ?? 0,
  limitTime: info.limitTime ?? 0,
})

export const getApiKeyInfo = async () => {
  const res = await apiGet<ApiKeyInfo>('/user/self/api-key')
  if (res.code === 0 && res.data) res.data = normalizeApiKeyInfo(res.data)
  return res
}

export const generateNewApiKey = (captchaPayload: {
  taskId: string; result: string
  captchaId: string; captchaOutput: string; genTime: string; lotNumber: string; passToken: string
}) => apiPost<ApiKeyInfo>('/user/self/api-key/new', captchaPayload)

const normalizeAltFetchResult = (payload: unknown): string[] => {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is string => typeof item === 'string')
  }

  if (typeof payload === 'string' && payload) {
    return [payload]
  }

  return []
}

const fetchAltByApiKey = async (apiKey: string, options?: { paid?: boolean; count?: number }): Promise<string[]> => {
  const params = new URLSearchParams({ userApiKey: apiKey })

  if (options?.paid) {
    params.set('paid', 'true')
  }

  if (typeof options?.count === 'number' && !Number.isNaN(options.count)) {
    params.set('count', String(options.count))
  }

  const res = await fetch(`/api/alt?${params.toString()}`)
  const json = await res.json()
  if (json.code !== 0) throw new Error(getApiMessage(json, '获取失败'))
  return normalizeAltFetchResult(json.data)
}

// Free API fetch: GET /api/alt?userApiKey={apiKey}
// Free calls only allow count=1.
export const fetchAltWithApiKey = async (apiKey: string): Promise<string> => {
  const result = await fetchAltByApiKey(apiKey)
  return result[0] ?? ''
}

// Paid API fetch: GET /api/alt?userApiKey={apiKey}&paid=true&count={count}
export const fetchPaidAltWithApiKey = (apiKey: string, count = 1): Promise<string[]> => {
  return fetchAltByApiKey(apiKey, { paid: true, count })
}
