import { useEffect, useState } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { convertSauth } from '@/api/misc'
import { getApiMessage } from '@/utils/apiMessage'
import './Convert.css'

export default function Convert() {
  const { user } = useAuthStore()
  const location = useLocation()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!user) return <Navigate to="/login" replace />

  const update = (k: 'username' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const username = params.get('username') || ''
    const password = params.get('password') || ''
    if (username || password) {
      setForm({ username, password })
    }
  }, [location.search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const res = await convertSauth(form.username, form.password)
      if (res.code === 0) {
        setResult(res.data.result)
      } else {
        setError(getApiMessage(res, '转换失败'))
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div className="page convert-page">
      <div className="container">
        <div className="convert-layout">
          <motion.div
            className="card convert-form-card"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>输入账号信息</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">4399 用户名</label>
                <input
                  className="input-field"
                  placeholder="输入 4399 用户名"
                  value={form.username}
                  onChange={update('username')}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">密码</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="输入密码"
                  value={form.password}
                  onChange={update('password')}
                  required
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  <span>✕</span><span>{error}</span>
                </div>
              )}

              <div className="alert alert-warn" style={{ fontSize: '0.8rem', marginBottom: '0.9rem' }}>
                <span>⚠️</span>
                <span>密码仅用于转换，不会存储。</span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner" /> 转换中…</>
                ) : '开始转换'}
              </button>
            </form>
          </motion.div>

          <motion.div
            className="convert-result-panel"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="card">
              <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>转换结果</h2>

              {!result && !loading && (
                <div className="convert-empty">
                  <div className="convert-empty-icon">⇄</div>
                  <p>填写左侧表单后开始转换</p>
                </div>
              )}

              {loading && (
                <div className="convert-processing">
                  <div className="convert-process-ring">
                    <div className="convert-process-inner">⇄</div>
                  </div>
                  <p>正在转换…</p>
                </div>
              )}

              {result && (
                <div className="convert-done">
                  <div className="badge badge-green" style={{ marginBottom: '1rem' }}>✓ 转换成功</div>
                  <div className="token-header">
                    <label className="label">SAuth Token</label>
                    <button className="btn btn-ghost btn-sm" onClick={copy}>
                      {copied ? '已复制' : '一键复制'}
                    </button>
                  </div>
                  <div className="token-display">
                    <code className="mono token-value">{result}</code>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
