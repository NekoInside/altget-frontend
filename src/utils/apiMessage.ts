import type { ApiResponse } from '@/types/api'

type ApiMessageSource = Pick<ApiResponse<unknown>, 'msg' | 'message'> | null | undefined

export const getApiMessage = (source: ApiMessageSource, fallback: string): string => {
  return source?.message || source?.msg || fallback
}
