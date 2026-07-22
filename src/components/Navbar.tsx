import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { logout } from '@/api/user'
import { motion, AnimatePresence } from 'framer-motion'
import {
  THEME_PRESETS,
  applyThemeColor,
  getStoredThemeSelection,
  resolveThemeColor,
  saveThemeSelection,
  type ThemeSelection,
} from '@/utils/theme'
import { trackEvent } from '@/utils/tracker'
import './Navbar.css'

export default function Navbar() {
  const { user, setToken, setUser } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [themeOpen, setThemeOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [themeSelection, setThemeSelection] = useState<ThemeSelection>(() => getStoredThemeSelection())
  const themeRef = useRef<HTMLDivElement | null>(null)
  const customColorInputRef = useRef<HTMLInputElement | null>(null)

  const navItems = useMemo(() => {
    const items = [{ to: '/', label: '获取账号', active: isActive(location.pathname, '/') }]
    if (user) {
      items.push({ to: '/convert', label: 'SAuth转换', active: isActive(location.pathname, '/convert') })
      items.push({ to: '/convert-cookie', label: 'Cookie转换', active: isActive(location.pathname, '/convert-cookie') })
      items.push({ to: '/used-alts', label: '使用记录', active: isActive(location.pathname, '/used-alts') })
      items.push({ to: '/profile', label: '个人中心', active: isActive(location.pathname, '/profile') })
    }
    return items
  }, [location.pathname, user])

  useEffect(() => {
    setThemeOpen(false)
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!themeOpen && !mobileMenuOpen) return

    const handlePointerDown = (e: MouseEvent) => {
      if (themeOpen && themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setThemeOpen(false)
      setMobileMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [themeOpen, mobileMenuOpen])

  const handleLogout = async () => {
    await logout()
    setToken(null)
    setUser(null)
    setMobileMenuOpen(false)
    navigate('/')
    trackEvent('logout')
  }

  const handleThemeChange = (selection: ThemeSelection) => {
    setThemeSelection(selection)
    applyThemeColor(resolveThemeColor(selection))
    saveThemeSelection(selection)
    trackEvent('theme_change', { type: selection.type, value: selection.type === 'preset' ? selection.key : selection.value })
  }

  const toggleThemeOpen = () => {
    setThemeOpen(open => {
      const next = !open
      if (next) setMobileMenuOpen(false)
      return next
    })
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(open => {
      const next = !open
      if (next) setThemeOpen(false)
      return next
    })
  }

  const currentThemeColor = resolveThemeColor(themeSelection)
  const customColor = themeSelection.type === 'custom' ? themeSelection.value : currentThemeColor

  return (
    <motion.nav
      className="navbar"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="navbar-inner container-wide">
        <Link to="/" className="navbar-brand">
          <img className="brand-image" src="/origin-brand.jfif" alt="凌清阁" loading="lazy" />
          <span className="brand-text">凌清阁-小号获取</span>
        </Link>

        <div className="navbar-links">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} active={item.active}>{item.label}</NavLink>
          ))}
        </div>

        <div className="navbar-actions">
          <div className="theme-control" ref={themeRef}>
            <button
              type="button"
              className={`theme-trigger ${themeOpen ? 'theme-trigger--active' : ''}`}
              onClick={toggleThemeOpen}
              aria-label="切换主题颜色"
              aria-expanded={themeOpen}
            >
              <span className="theme-trigger-icon">◉</span>
              <span className="theme-trigger-dot" style={{ background: currentThemeColor }} />
            </button>

            {themeOpen && (
              <div className="theme-popover card">
                <div className="theme-popover-header">
                  <span className="theme-popover-title">主题颜色</span>
                  <span className="theme-popover-value mono">{currentThemeColor}</span>
                </div>

                <div className="theme-grid">
                  {THEME_PRESETS.map(preset => {
                    const active = themeSelection.type === 'preset' && themeSelection.key === preset.key
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        className={`theme-swatch ${active ? 'theme-swatch--active' : ''}`}
                        style={{ background: preset.value }}
                        onClick={() => handleThemeChange({ type: 'preset', key: preset.key })}
                        title={preset.label}
                        aria-label={preset.label}
                      />
                    )
                  })}
                </div>

                <div className="theme-custom-row">
                  <div className="theme-custom-meta">
                    <span className="theme-custom-label">自定义颜色</span>
                    <span className="theme-custom-hint">选择任意主题色</span>
                  </div>
                  <button
                    type="button"
                    className={`theme-custom-trigger ${themeSelection.type === 'custom' ? 'theme-custom-trigger--active' : ''}`}
                    style={{ background: customColor }}
                    onClick={() => customColorInputRef.current?.click()}
                    aria-label="选择自定义颜色"
                  />
                  <input
                    ref={customColorInputRef}
                    className="theme-custom-input"
                    type="color"
                    value={customColor}
                    onChange={e => handleThemeChange({ type: 'custom', value: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {user ? (
            <div className="navbar-user">
              <span className="navbar-username">{user.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>退出</button>
            </div>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="btn btn-ghost btn-sm">登录</Link>
              <Link to="/register" className="btn btn-primary btn-sm">注册</Link>
            </div>
          )}

          <button
            type="button"
            className={`mobile-menu-trigger ${mobileMenuOpen ? 'mobile-menu-trigger--active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="打开导航菜单"
            aria-expanded={mobileMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.button
              type="button"
              className="mobile-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileMenuOpen(false)}
              aria-label="关闭导航菜单"
            />
            <motion.div
              className="mobile-menu card"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              {user && (
                <div className="mobile-menu-user">
                  <span className="mobile-menu-user-label">当前登录</span>
                  <span className="mobile-menu-user-name mono">{user.username}</span>
                </div>
              )}

              <div className="mobile-menu-links">
                {navItems.map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`mobile-menu-link ${item.active ? 'mobile-menu-link--active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mobile-menu-footer">
                {user ? (
                  <button className="btn btn-ghost btn-sm mobile-menu-auth-btn" onClick={handleLogout}>退出登录</button>
                ) : (
                  <div className="mobile-menu-auth">
                    <Link to="/login" className="btn btn-ghost btn-sm" onClick={() => setMobileMenuOpen(false)}>登录</Link>
                    <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setMobileMenuOpen(false)}>注册</Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

function isActive(pathname: string, path: string) {
  return pathname === path
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link to={to} className={`nav-link ${active ? 'nav-link--active' : ''}`} onClick={() => trackEvent('nav_click', { page: to })}>
      {children}
    </Link>
  )
}
