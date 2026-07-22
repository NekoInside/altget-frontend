import { apiPost } from './http'

export const convertCookie = (account: string, password: string) =>
  apiPost<string>('/alt/convert/cookie', { account, password })
