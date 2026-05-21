import axios from 'axios'
import type { ApiResponse } from '@/types/api'

const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30_000,
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
