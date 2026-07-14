import { apiGet } from './http'
import { getStoredAuthToken } from '@/store/auth'
import { API_BASE } from '@/utils/apiBase'
import type { ApiResponse, PageResponse, UsedAlt } from '@/types/api'
import { getApiMessage } from '@/utils/apiMessage'

export interface UsedAltsQuery {
  page?: number
  size?: number
  channel?: string
  username?: string
}

/** Fetch the current user's used-alt history (paginated, filterable). */
export const getUsedAlts = (params: UsedAltsQuery = {}) =>
  apiGet<PageResponse<UsedAlt>>('/user/self/used-alts', params as Record<string, unknown>)

/**
 * Export the current user's used-alt history as a CSV download.
 *
 * The backend streams a CSV file on success (HTTP 200) but returns the usual
 * JSON envelope when rate-limited (HTTP 400). On the non-OK path we parse the
 * JSON body so the caller can surface the server message (e.g. "每天只能导出一次").
 */
export const exportUsedAlts = async (): Promise<{ ok: true } | { ok: false; message: string }> => {
  const token = getStoredAuthToken()
  const res = await fetch(`${API_BASE}/api/user/self/used-alts/export`, {
    method: 'GET',
    credentials: 'include',
    headers: token ? { 'X-Ciallo-Auth': token } : {},
  })

  const contentType = res.headers.get('content-type') ?? ''

  // Rate-limited / error path: backend returns the JSON envelope.
  if (!res.ok || contentType.includes('application/json')) {
    let parsed: ApiResponse<unknown> | null = null
    try {
      parsed = await res.json()
    } catch {
      // ignore parse failure
    }
    return { ok: false, message: getApiMessage(parsed, '导出失败，请稍后再试') }
  }

  // Success path: stream the CSV blob to a download.
  const blob = await res.blob()
  // Fallback filename if the server did not send Content-Disposition.
  const disposition = res.headers.get('content-disposition') ?? ''
  const match = /filename="?([^";]+)"?/.exec(disposition)
  const filename = match?.[1] || `used-alts-${Date.now()}.csv`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { ok: true }
}
