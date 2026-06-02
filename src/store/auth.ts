import { create } from 'zustand'
import type { UserInfo } from '@/types/api'

interface AuthState {
  user: UserInfo | null
  token: string | null
  checked: boolean
  setUser: (user: UserInfo | null) => void
  setToken: (token: string | null) => void
  setChecked: (v: boolean) => void
}

const AUTH_TOKEN_KEY = 'altget.auth.token'

export const getStoredAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY)

export const saveAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getStoredAuthToken(),
  checked: false,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    saveAuthToken(token)
    set({ token })
  },
  setChecked: (checked) => set({ checked }),
}))
