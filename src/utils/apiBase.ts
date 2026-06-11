/**
 * API base URL for domain separation.
 * In development, VITE_API_BASE_URL can be empty → uses Vite proxy (/api → relative).
 * In production, set VITE_API_BASE_URL to the backend domain, e.g. "https://4399.nekoinsi.de".
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

/** Build a full API URL by prepending API_BASE. */
export const apiUrl = (path: string): string => `${API_BASE}${path}`
