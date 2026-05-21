import { create } from 'zustand'
import type { UserInfo } from '@/types/api'

interface AuthState {
  user: UserInfo | null
  checked: boolean
  setUser: (user: UserInfo | null) => void
  setChecked: (v: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  checked: false,
  setUser: (user) => set({ user }),
  setChecked: (checked) => set({ checked }),
}))
