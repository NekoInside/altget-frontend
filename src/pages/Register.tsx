import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getPowTask } from '@/services/pow'
import './Auth.css'

const CAPTCHA_ID = '9589c1ac7f7819298973eabdd6365fcf'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const captchaResRef = useRef<{
    captchaId: string; captchaOutput: string; genTime: string; lotNumber: string; passToken: string
  } | null>(null)
  const captchaObjRef = useRef<GeetestCaptchaObj | null>(null)

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const hashPassword = async (pwd: string): Promise<string> => {
    const buf = new TextEncoder().encode(pwd + '==altget')
    const hashBuf = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const isValidUsername = (u: string) =>
    /^(?=.{3,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/.test(u)

  const isValidPassword = (p: string) =>
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d_.!@#$%^&*]{8,}$/.test(p)

  const validate = (): string | null => {
    if (!isValidUsername(form.username)) return '用户名 3-20 位，仅限字母、数字、_ .'
    if (!/^\d+@qq\.com$/.test(form.email)) return '目前仅支持 QQ 邮箱 (xxxxx@qq.com)'
    if (!isValidPassword(form.password)) return '密码至少 8 位，需含字母和数字'
    if (form.password !== form.confirm) return '两次密码不一致'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) return setError(err)
    setError(null)
    setLoading(true)

    // Load geetest if not already loaded
    if (typeof initGeetest4 === 'undefined') {
      // gt4 script loaded via index.html, wait a tick
      setError('验证码组件未加载，请刷新页面')
      setLoading(false)
      return
    }
    setShowCaptcha(true)
  }

  // When showCaptcha becomes true, init geetest
  useEffect(() => {
    if (!showCaptcha) return
    const interval = setInterval(() => {
      const el = document.getElementById('gt-container-register')
      if (!el) return
      clearInterval(interval)
      initGeetest4({ captchaId: CAPTCHA_ID, product: 'popup' }, (obj) => {
        captchaObjRef.current = obj
        obj.appendTo('#gt-container-register')
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
          doRegister()
        })
      })
    }, 200)
    return () => clearInterval(interval)
  }, [showCaptcha])

  const doRegister = async () => {
    if (!captchaResRef.current) return
    try {
      const [pwdHash, { taskId, nonce }] = await Promise.all([
        hashPassword(form.password),
        getPowTask('register'),
      ])
      const res = await fetch('/api/user/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: pwdHash,
          powId: taskId,
          nonce,
          ...captchaResRef.current,
        }),
      })
      const data = await res.json()
      if (data.code === 0) {
        setSuccess(true)
      } else {
        setError(data.msg || '注册失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page page">
        <div className="auth-bg-orb" aria-hidden />
        <motion.div className="auth-card card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="auth-success">
            <div className="auth-success-icon">✉️</div>
            <h2 className="auth-title">验证邮件已发送</h2>
            <p>请检查你的 QQ 邮箱，点击激活链接完成注册（有效期 10 分钟）。</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>前往登录</Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="auth-page page">
      <div className="auth-bg-orb" aria-hidden />
      <motion.div
        className="auth-card card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-logo">⬡</div>
        <h1 className="auth-title">创建账号</h1>
        <p className="auth-sub">注册 AltGet，解锁更多功能</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">用户名</label>
            <input className="input-field" type="text" placeholder="3-20 位，字母/数字/_." value={form.username} onChange={update('username')} required />
          </div>
          <div className="form-group">
            <label className="label">QQ 邮箱</label>
            <input className="input-field" type="email" placeholder="xxxxx@qq.com" value={form.email} onChange={update('email')} required />
          </div>
          <div className="form-group">
            <label className="label">密码</label>
            <input className="input-field" type="password" placeholder="至少 8 位，含字母和数字" value={form.password} onChange={update('password')} required />
          </div>
          <div className="form-group">
            <label className="label">确认密码</label>
            <input className="input-field" type="password" placeholder="再次输入密码" value={form.confirm} onChange={update('confirm')} required />
          </div>

          {error && (
            <div className="alert alert-error"><span>✕</span><span>{error}</span></div>
          )}

          {showCaptcha && (
            <div className="captcha-wrapper">
              <div id="gt-container-register" />
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading || showCaptcha}>
            {loading ? <><span className="spinner" /> 处理中…</> : showCaptcha ? '请完成验证…' : '创建账号'}
          </button>
        </form>

        <div className="auth-footer">
          已有账号？<Link to="/login">立即登录</Link>
        </div>
      </motion.div>
    </div>
  )
}
