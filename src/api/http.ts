import axios from 'axios'
import type { ApiResponse } from '@/types/api'
import { getStoredAuthToken } from '@/store/auth'
import { API_BASE } from '@/utils/apiBase'

const http = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  timeout: 30_000,
})

export const getAuthHeaders = (): Record<string, string> => {
  const token = getStoredAuthToken()
  return token ? { Authorization: `Ciallo ${token}` } : {}
}

http.interceptors.request.use((config) => {
  const token = getStoredAuthToken()
  if (token) {
    config.headers.Authorization = `Ciallo ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err),
)

export async function apiGet<T = null>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const res = await http.get<ApiResponse<T>>(url, { params })
  return res.data
}

export async function apiPost<T = null>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  const res = await http.post<ApiResponse<T>>(url, data)
  return res.data
}

export async function apiDelete<T = null>(url: string): Promise<ApiResponse<T>> {
  const res = await http.delete<ApiResponse<T>>(url)
  return res.data
}

export default http
