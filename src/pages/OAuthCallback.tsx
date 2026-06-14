import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import {
  completeDiscordBind,
  completeGithubBind,
  completeGithubLogin,
  getGithubOAuthUsage,
  getUserInfo,
} from '@/api/user'
import { getApiMessage } from '@/utils/apiMessage'
import { trackEvent } from '@/utils/tracker'
import './Auth.css'

type Provider = 'github' | 'discord'

export default function OAuthCallback({ provider }: { provider: Provider }) {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading')
  const [message, setMessage] = useState('正在完成授权，请稍候...')

  useEffect(() => {
    const code = params.get('code') || ''
    const state = params.get('state') || ''

    if (!code || (provider === 'github' && !state)) {
      setMessage('授权回调参数不完整，请重新尝试。')
      setStatus('err')
      return
    }

    const run = async () => {
      try {
        trackEvent('oauth_callback', { provider, action: 'start' })
        if (provider === 'github') {
          const usageRes = await getGithubOAuthUsage(state)
          if (usageRes.code !== 0) throw new Error(getApiMessage(usageRes, '无效的授权状态'))

          if (usageRes.data === 'login') {
            const loginRes = await completeGithubLogin(code, state)
            if (loginRes.code !== 0) throw new Error(getApiMessage(loginRes, 'GitHub 登录失败'))
            setToken(loginRes.data)
            const info = await getUserInfo()
            if (info.code === 0) setUser(info.data)
            trackEvent('oauth_callback', { provider, action: 'login_success' })
            navigate('/', { replace: true })
            return
          }

          const bindRes = await completeGithubBind(code, state)
          if (bindRes.code !== 0) throw new Error(getApiMessage(bindRes, 'GitHub 绑定失败'))
        } else {
          const bindRes = await completeDiscordBind(code)
          if (bindRes.code !== 0) throw new Error(getApiMessage(bindRes, 'Discord 绑定失败'))
        }

        const info = await getUserInfo()
        if (info.code === 0) setUser(info.data)
        trackEvent('oauth_callback', { provider, action: 'bind_success' })
        setMessage('绑定成功')
        setStatus('ok')
        window.setTimeout(() => navigate('/profile', { replace: true }), 800)
      } catch (err) {
        const errMsg = (err as Error).message || '授权失败，请稍后重试。'
        setMessage(errMsg)
        setStatus('err')
        trackEvent('oauth_callback', { provider, action: 'error', error: errMsg })
      }
    }

    run()
  }, [navigate, params, provider, setToken, setUser])

  return (
    <div className="auth-page page">
      <div className="auth-bg-orb" aria-hidden />
      <motion.div className="auth-card card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        {status === 'loading' && <div className="auth-logo"><span className="spinner" style={{ width: 28, height: 28 }} /></div>}
        {status === 'ok' && <div className="auth-logo">✓</div>}
        {status === 'err' && <div className="auth-logo">✕</div>}
        <h1 className="auth-title">{provider === 'github' ? 'GitHub 授权' : 'Discord 授权'}</h1>
        <p className="auth-sub">{message}</p>
        {status === 'err' && (
          <div className="auth-footer" style={{ marginTop: '1.25rem' }}>
            <Link to="/login">前往登录</Link>
            <span>·</span>
            <Link to="/profile">返回个人中心</Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}