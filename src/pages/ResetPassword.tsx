import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { resetPassword } from '@/api/user'
import { createSrpRegistration } from '@/utils/srp'
import { getApiMessage } from '@/utils/apiMessage'
import { trackEvent } from '@/utils/tracker'
import './Auth.css'

const isValidPassword = (password: string) =>
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d_.!@#$%^&*]{8,}$/.test(password)

export default function ResetPassword() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', [])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('重置链接无效，请重新申请找回密码')
      return
    }
    if (!username.trim()) {
      setError('请输入账号用户名')
      return
    }
    if (!isValidPassword(password)) {
      setError('密码至少 8 位，需含字母和数字')
      return
    }
    if (password !== confirm) {
      setError('两次密码不一致')
      return
    }

    setLoading(true)
    trackEvent('password_reset_submit')
    try {
      const { salt, verifier } = await createSrpRegistration(username.trim(), password)
      const res = await resetPassword(token, salt, verifier)
      if (res.code === 0) {
        setSuccess(true)
        trackEvent('password_reset_success')
      } else {
        const errMsg = getApiMessage(res, '重置密码失败')
        setError(errMsg)
        trackEvent('password_reset_error', { error: errMsg })
      }
    } catch {
      const errMsg = '网络错误，请稍后重试'
      setError(errMsg)
      trackEvent('password_reset_error', { error: errMsg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page page">
      <div className="auth-bg-orb" aria-hidden />
      <motion.div className="auth-card card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-logo">🔒</div>
        {success ? (
          <div className="auth-success">
            <div className="auth-success-icon">✓</div>
            <h2 className="auth-title">密码已重置</h2>
            <p>你的密码已经更新，旧登录状态和已绑定的第三方账号也已失效，请使用新密码重新登录。</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>前往登录</Link>
          </div>
        ) : (
          <>
            <h1 className="auth-title">重置密码</h1>
            <p className="auth-sub">设置一个新的登录密码</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">用户名</label>
                <input
                  className="input-field"
                  type="text"
                  autoComplete="username"
                  placeholder="输入你的账号用户名"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">新密码</label>
                <input
                  className="input-field"
                  type="password"
                  autoComplete="new-password"
                  placeholder="至少 8 位，含字母和数字"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">确认新密码</label>
                <input
                  className="input-field"
                  type="password"
                  autoComplete="new-password"
                  placeholder="再次输入新密码"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && <div className="alert alert-error"><span>✕</span><span>{error}</span></div>}
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading || !token}>
                {loading ? <><span className="spinner" /> 提交中…</> : '确认重置'}
              </button>
            </form>
            <div className="auth-footer">
              <Link to="/forgot-password">重新申请重置链接</Link>
              <span>·</span>
              <Link to="/login">返回登录</Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
