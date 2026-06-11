import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { getPasswordChallenge, getUserInfo, verifyPasswordLogin, LOGIN_GITHUB_URL } from '@/api/user'
import { getPasskeyLoginOptions, verifyPasskeyLogin } from '@/api/misc'
import { createSrpLoginProof, extractToken } from '@/utils/srp'
import { bufferToBase64url, parseAuthenticationRequestOptions } from '@/utils/webauthn'
import { getApiMessage } from '@/utils/apiMessage'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setToken, setUser } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const redirect = new URLSearchParams(location.search).get('redirect') || '/'

  useEffect(() => {
    setPasskeySupported(!!window.PublicKeyCredential)
    if (window.PublicKeyCredential) {
      startConditionalUI()
    }
    return () => { abortRef.current?.abort() }
  }, [])

  const startConditionalUI = async () => {
    if (!window.PublicKeyCredential || !('isConditionalMediationAvailable' in PublicKeyCredential)) return
    try {
      const available = await (PublicKeyCredential as unknown as { isConditionalMediationAvailable(): Promise<boolean> }).isConditionalMediationAvailable()
      if (!available) return
      const optRes = await getPasskeyLoginOptions()
      if (optRes.code !== 0) return
      const { challengeId, options } = optRes.data
      const reqOptions = parseAuthenticationRequestOptions(options)
      if (!reqOptions.publicKey) return
      abortRef.current = new AbortController()
      const credential = await navigator.credentials.get({
        ...reqOptions,
        mediation: 'conditional' as CredentialMediationRequirement,
        signal: abortRef.current.signal,
      }) as PublicKeyCredential | null
      if (!credential) return
      await completePasskeyLogin(challengeId, credential)
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') console.error('Conditional UI error:', e)
    }
  }

  const completePasskeyLogin = async (challengeId: string, credential: PublicKeyCredential) => {
    const r = credential.response as AuthenticatorAssertionResponse
    const credJson = {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        authenticatorData: bufferToBase64url(r.authenticatorData),
        clientDataJSON: bufferToBase64url(r.clientDataJSON),
        signature: bufferToBase64url(r.signature),
        userHandle: r.userHandle ? bufferToBase64url(r.userHandle) : null,
      },
      clientExtensionResults: credential.getClientExtensionResults(),
    }
    const res = await verifyPasskeyLogin(challengeId, JSON.stringify(credJson))
    if (res.code !== 0) throw new Error(getApiMessage(res, '通行密钥登录失败'))
    const token = extractToken(res.data)
    if (!token) throw new Error('登录响应缺少 token')
    setToken(token)
    await afterLogin()
  }

  const loginWithPasskey = async () => {
    abortRef.current?.abort()
    setPasskeyLoading(true)
    setError(null)
    try {
      const optRes = await getPasskeyLoginOptions()
      if (optRes.code !== 0) throw new Error(getApiMessage(optRes, '通行密钥登录失败'))
      const { challengeId, options } = optRes.data
      const reqOptions = parseAuthenticationRequestOptions(options)
      const credential = await navigator.credentials.get(reqOptions) as PublicKeyCredential | null
      if (!credential) throw new Error('未获取到有效的 Passkey 凭据')
      await completePasskeyLogin(challengeId, credential)
    } catch (e: unknown) {
      const err = e as Error
      if (err.name === 'NotAllowedError') setError('操作已取消')
      else setError(err.message || '通行密钥登录失败')
    } finally {
      setPasskeyLoading(false)
      startConditionalUI()
    }
  }

  const afterLogin = async () => {
    const info = await getUserInfo()
    if (info.code === 0) setUser(info.data)
    navigate(redirect, { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    abortRef.current?.abort()
    setError(null)
    setLoading(true)

    try {
      const challenge = await getPasswordChallenge(username)
      if (challenge.code !== 0) throw new Error(getApiMessage(challenge, '登录失败'))
      const proof = await createSrpLoginProof(username, password, challenge.data.salt, challenge.data.serverPublicKey)
      const data = await verifyPasswordLogin(challenge.data.challengeId, proof.a, proof.m1)
      if (data.code !== 0) throw new Error(getApiMessage(data, '登录失败'))
      const token = extractToken(data.data)
      if (!token) throw new Error('登录响应缺少 token')
      setToken(token)
      await afterLogin()
    } catch (err: unknown) {
      setError((err as Error).message || '登录失败')
    } finally {
      setLoading(false)
    }
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
        <h1 className="auth-title">欢迎回来</h1>
        <p className="auth-sub">登录你的 AltGet 账号</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="username">用户名</label>
            <input
              id="username"
              className="input-field"
              type="text"
              autoComplete="username webauthn"
              placeholder="输入用户名"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="password">密码</label>
            <input
              id="password"
              className="input-field"
              type="password"
              autoComplete="current-password"
              placeholder="输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <span>✕</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <><span className="spinner" /> 登录中…</> : '登录'}
          </button>
        </form>

        <div className="auth-divider"><span>或使用</span></div>

        <div className="social-btns">
          <a href={LOGIN_GITHUB_URL} className="btn btn-ghost social-btn">
            <GithubIcon /> GitHub 登录
          </a>
          {passkeySupported && (
            <button className="btn btn-ghost social-btn" onClick={loginWithPasskey} disabled={passkeyLoading}>
              {passkeyLoading ? <><span className="spinner" /> 请求中…</> : '🔑 Passkey 登录'}
            </button>
          )}
        </div>

        <div className="auth-footer">
          <Link to="/forgot-password">忘记密码？</Link>
          <span>·</span>
          <span>没有账号？<Link to="/register">立即注册</Link></span>
        </div>
      </motion.div>
    </div>
  )
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}
