import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { forgotPassword } from '@/api/user'
import { getApiMessage } from '@/utils/apiMessage'
import './Auth.css'

const CAPTCHA_ID = '9589c1ac7f7819298973eabdd6365fcf'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const captchaResRef = useRef<{
    captchaId: string; captchaOutput: string; genTime: string; lotNumber: string; passToken: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    if (typeof initGeetest4 === 'undefined') {
      setError('验证码组件未加载，请刷新页面')
      setLoading(false)
      return
    }
    setShowCaptcha(true)
  }

  useEffect(() => {
    if (!showCaptcha) return
    const interval = setInterval(() => {
      const el = document.getElementById('gt-container-forgot')
      if (!el) return
      clearInterval(interval)
      initGeetest4({ captchaId: CAPTCHA_ID, product: 'popup' }, (obj) => {
        obj.appendTo('#gt-container-forgot')
        obj.onSuccess(() => {
          const r = obj.getValidate()
          captchaResRef.current = {
            captchaId: r.captcha_id,
            captchaOutput: r.captcha_output,
            genTime: r.gen_time,
            lotNumber: r.lot_number,
            passToken: r.pass_token,
          }
          setShowCaptcha(false)
          doRequest()
        })
      })
    }, 200)
    return () => clearInterval(interval)
  }, [showCaptcha])

  const doRequest = async () => {
    if (!captchaResRef.current) return
    try {
      const data = await forgotPassword({
        email,
        ...captchaResRef.current,
      })
      if (data.code === 0) {
        setSent(true)
      } else {
        setError(getApiMessage(data, '发送失败'))
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page page">
      <div className="auth-bg-orb" aria-hidden />
      <motion.div className="auth-card card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-logo">🔑</div>
        {sent ? (
          <div className="auth-success">
            <div className="auth-success-icon">✉️</div>
            <h2 className="auth-title">邮件已发送</h2>
            <p>请检查你的邮箱，点击重置链接（有效期 30 分钟）。</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>返回登录</Link>
          </div>
        ) : (
          <>
            <h1 className="auth-title">找回密码</h1>
            <p className="auth-sub">输入注册邮箱，我们将发送重置链接</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">邮箱</label>
                <input
                  className="input-field"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <div className="alert alert-error"><span>✕</span><span>{error}</span></div>}
              {showCaptcha && (
                <div className="captcha-wrapper">
                  <div id="gt-container-forgot" />
                </div>
              )}
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading || showCaptcha}>
                {loading ? <><span className="spinner" /> 发送中…</> : showCaptcha ? '请完成验证…' : '发送重置邮件'}
              </button>
            </form>
            <div className="auth-footer"><Link to="/login">← 返回登录</Link></div>
          </>
        )}
      </motion.div>
    </div>
  )
}
