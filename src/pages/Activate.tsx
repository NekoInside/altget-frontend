import { useMemo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { activateAccount } from '@/api/user'
import { getApiMessage } from '@/utils/apiMessage'
import { trackEvent } from '@/utils/tracker'
import './Auth.css'

export default function Activate() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', [])
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setErrMsg('激活链接无效，请检查邮件中的链接是否完整。')
      setStatus('err')
      return
    }

    activateAccount(token)
      .then(data => {
        if (data.code === 0) {
          setStatus('ok')
          trackEvent('account_activate_success')
        } else {
          const errMsg = getApiMessage(data, '激活失败，链接可能已过期。')
          setErrMsg(errMsg)
          setStatus('err')
          trackEvent('account_activate_error', { error: errMsg })
        }
      })
      .catch(() => {
        const errMsg = '网络错误，请稍后重试。'
        setErrMsg(errMsg)
        setStatus('err')
        trackEvent('account_activate_error', { error: errMsg })
      })
  }, [token])

  return (
    <div className="auth-page page">
      <div className="auth-bg-orb" aria-hidden />
      <motion.div className="auth-card card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        {status === 'loading' && (
          <>
            <div className="auth-logo" style={{ fontSize: '1.8rem' }}>
              <span className="spinner" style={{ width: 28, height: 28 }} />
            </div>
            <h1 className="auth-title">账号激活中</h1>
            <p className="auth-sub">正在验证激活链接，请稍候…</p>
          </>
        )}

        {status === 'ok' && (
          <>
            <div className="auth-logo">✓</div>
            <h1 className="auth-title">激活成功</h1>
            <p className="auth-sub">你的账号已激活，现在可以登录了。</p>
            <Link to="/login" className="btn btn-primary auth-submit" style={{ marginTop: '1.5rem' }} onClick={() => trackEvent('activate_go_login')}>
              前往登录
            </Link>
          </>
        )}

        {status === 'err' && (
          <>
            <div className="auth-logo">✕</div>
            <h1 className="auth-title">激活失败</h1>
            <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
              <span>✕</span>
              <span>{errMsg}</span>
            </div>
            <div className="auth-footer" style={{ marginTop: '1.25rem' }}>
              <Link to="/login">前往登录</Link>
              <span>·</span>
              <Link to="/register">重新注册</Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
