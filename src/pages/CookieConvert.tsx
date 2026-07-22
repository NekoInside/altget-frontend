import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { convertCookie } from '@/api/cookieConvert'
import { getCoinBalance } from '@/api/user'
import { useAuthStore } from '@/store/auth'
import { getApiMessage } from '@/utils/apiMessage'
import { trackEvent } from '@/utils/tracker'
import './CookieConvert.css'

export default function CookieConvert() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({ account: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!user) return <Navigate to="/login" replace />

  const update = (field: 'account' | 'password') => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(previous => ({ ...previous, [field]: event.target.value }))
  }

  const refreshBalance = async () => {
    const balance = await getCoinBalance()
    if (balance.code === 0) {
      setUser({ ...user, coinBalance: balance.data.balance, balance: balance.data.balance })
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    trackEvent('cookie_convert_submit')

    try {
      const response = await convertCookie(form.account, form.password)
      if (response.code === 0) {
        setResult(response.data)
        try {
          await refreshBalance()
        } catch {
          // The conversion succeeded even when the non-critical balance refresh fails.
        }
        trackEvent('cookie_convert_success')
      } else {
        const message = getApiMessage(response, '转换失败')
        setError(message)
        trackEvent('cookie_convert_error', { error: message })
      }
    } catch {
      const message = '网络错误，请稍后重试'
      setError(message)
      trackEvent('cookie_convert_error', { error: message })
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="page cookie-convert-page">
      <div className="container">
        <div className="cookie-convert-layout">
          <motion.section
            className="card cookie-convert-form-card"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            aria-labelledby="cookie-convert-form-title"
          >
            <h1 id="cookie-convert-form-title" className="section-title">Cookie 转换</h1>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label" htmlFor="cookie-account">账号</label>
                <input
                  id="cookie-account"
                  className="input-field"
                  placeholder="输入账号"
                  autoComplete="username"
                  value={form.account}
                  onChange={update('account')}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="cookie-password">密码</label>
                <input
                  id="cookie-password"
                  className="input-field"
                  type="password"
                  placeholder="输入密码"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={update('password')}
                  required
                />
              </div>

              {error && <div className="alert alert-error" role="alert">{error}</div>}

              <p className="cookie-convert-note">成功转换后消耗 1 coin。密码仅用于本次转换，不会存储。</p>

              <button
                type="submit"
                className="btn btn-primary cookie-convert-submit"
                disabled={loading}
              >
                {loading ? <><span className="spinner" />转换中</> : '开始转换'}
              </button>
            </form>
          </motion.section>

          <motion.section
            className="card cookie-convert-result-card"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            aria-labelledby="cookie-convert-result-title"
          >
            <h2 id="cookie-convert-result-title" className="section-title">Netscape Cookie</h2>

            {!result && !loading && <p className="cookie-convert-empty">提交账号信息后将在此显示 Cookie。</p>}
            {loading && <div className="cookie-convert-processing"><span className="spinner" />正在请求转换服务</div>}
            {result && (
              <div className="cookie-convert-done">
                <div className="cookie-convert-result-header">
                  <span className="badge badge-green">转换成功</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
                    {copied ? '已复制' : '复制 Cookie'}
                  </button>
                </div>
                <pre className="cookie-convert-output"><code>{result}</code></pre>
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </div>
  )
}
