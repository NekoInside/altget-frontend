const THEME_COLOR_KEY = 'theme_color'
export const DEFAULT_THEME_COLOR = '#9859ff'
export const DEFAULT_THEME_PRESET = 'violet'

export const THEME_PRESETS = [
  { key: 'emerald', label: 'Emerald', value: '#10b981' },
  { key: 'green', label: 'Green', value: '#22c55e' },
  { key: 'lime', label: 'Lime', value: '#84cc16' },
  { key: 'orange', label: 'Orange', value: '#f97316' },
  { key: 'amber', label: 'Amber', value: '#f59e0b' },
  { key: 'yellow', label: 'Yellow', value: '#eab308' },
  { key: 'teal', label: 'Teal', value: '#14b8a6' },
  { key: 'cyan', label: 'Cyan', value: '#06b6d4' },
  { key: 'sky', label: 'Sky', value: '#0ea5e9' },
  { key: 'blue', label: 'Blue', value: '#3b82f6' },
  { key: 'indigo', label: 'Indigo', value: '#6366f1' },
  { key: 'violet', label: 'Violet', value: '#8b5cf6' },
  { key: 'purple', label: 'Purple', value: '#a855f7' },
  { key: 'fuchsia', label: 'Fuchsia', value: '#d946ef' },
  { key: 'pink', label: 'Pink', value: '#ec4899' },
  { key: 'rose', label: 'Rose', value: '#f43f5e' },
] as const

export type ThemePresetKey = (typeof THEME_PRESETS)[number]['key']

export type ThemeSelection =
  | { type: 'preset'; key: ThemePresetKey }
  | { type: 'custom'; value: string }

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized

  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r:
        h = 60 * (((g - b) / delta) % 6)
        break
      case g:
        h = 60 * ((b - r) / delta + 2)
        break
      default:
        h = 60 * ((r - g) / delta + 4)
        break
    }
  }

  if (h < 0) h += 360

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function normalizeHex(hex: string): string {
  const normalized = hex.trim().toLowerCase()
  const expanded = normalized.length === 4
    ? `#${normalized.slice(1).split('').map(ch => ch + ch).join('')}`
    : normalized
  return /^#[0-9a-f]{6}$/i.test(expanded) ? expanded : DEFAULT_THEME_COLOR
}

export function getThemePresetValue(key: ThemePresetKey): string {
  return THEME_PRESETS.find(preset => preset.key === key)?.value ?? DEFAULT_THEME_COLOR
}

export function resolveThemeColor(selection: ThemeSelection): string {
  return selection.type === 'preset'
    ? getThemePresetValue(selection.key)
    : normalizeHex(selection.value)
}

export function applyThemeColor(hex: string) {
  if (typeof document === 'undefined') return
  const { h, s, l } = hexToHsl(normalizeHex(hex))
  const root = document.documentElement
  root.style.setProperty('--theme-h', String(h))
  root.style.setProperty('--theme-s', `${s}%`)
  root.style.setProperty('--theme-l', `${l}%`)
}

export function getStoredThemeSelection(): ThemeSelection {
  if (typeof window === 'undefined') return { type: 'preset', key: DEFAULT_THEME_PRESET }

  const raw = window.localStorage.getItem(THEME_COLOR_KEY)
  if (!raw) return { type: 'preset', key: DEFAULT_THEME_PRESET }

  if (raw.startsWith('#')) {
    return { type: 'custom', value: normalizeHex(raw) }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ThemeSelection>
    if (parsed.type === 'preset' && typeof parsed.key === 'string') {
      const preset = THEME_PRESETS.find(item => item.key === parsed.key)
      if (preset) return { type: 'preset', key: preset.key }
    }
    if (parsed.type === 'custom' && typeof parsed.value === 'string') {
      return { type: 'custom', value: normalizeHex(parsed.value) }
    }
  } catch {
    return { type: 'custom', value: DEFAULT_THEME_COLOR }
  }

  return { type: 'preset', key: DEFAULT_THEME_PRESET }
}

export function getStoredThemeColor(): string {
  return resolveThemeColor(getStoredThemeSelection())
}

export function saveThemeSelection(selection: ThemeSelection) {
  if (typeof window === 'undefined') return
  const normalized = selection.type === 'preset'
    ? selection
    : { type: 'custom' as const, value: normalizeHex(selection.value) }
  window.localStorage.setItem(THEME_COLOR_KEY, JSON.stringify(normalized))
}

export function saveThemeColor(hex: string) {
  saveThemeSelection({ type: 'custom', value: hex })
}

export function resetThemeColor() {
  const selection: ThemeSelection = { type: 'preset', key: DEFAULT_THEME_PRESET }
  saveThemeSelection(selection)
  applyThemeColor(resolveThemeColor(selection))
}

export function initializeThemeColor() {
  applyThemeColor(getStoredThemeColor())
}
