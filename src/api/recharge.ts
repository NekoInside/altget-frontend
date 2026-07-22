import { apiGet, apiPost } from './http'
import type { ApiResponse, OxaPayRecharge } from '@/types/api'

export const createOxaPayRecharge = (usdAmount: number): Promise<ApiResponse<OxaPayRecharge>> =>
  apiPost('/coins/recharges/oxapay', { usdAmount })

export const getRechargeOrder = (orderId: string): Promise<ApiResponse<OxaPayRecharge>> =>
  apiGet(`/coins/recharges/${encodeURIComponent(orderId)}`)
