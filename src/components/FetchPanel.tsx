import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { getPowTask } from '@/services/pow'
import './FetchPanel.css'

const CAPTCHA_ID = '9589c1ac7f7819298973eabdd6365fcf'
const DEFAULT_CHANNEL = 'default'
const BMW_CHANNEL = 'bmw-exempt'

interface FetchResult {
  username: string
  password: string
}

export default function FetchPanel() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FetchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'user' | 'pass' | 'all' | null>(null)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const captchaResRef = useRef<{
    captchaId: string; captchaOutput: string; genTime: string; lotNumber: string; passToken: string
  } | null>(null)
  const pendingFetchRef = useRef(false)

  const doFetch = useCallback(async (
    captchaId = '', captchaOutput = '', genTime = '', lotNumber = '', passToken = ''
  ) => {
    try {
      const { taskId, nonce } = await getPowTask('fetch')
      // get param from url for channel, default to DEFAULT_CHANNEL
      const urlParams = new URLSearchParams(window.location.search)
      const channel = urlParams.get('channel') === 'bmw' ? BMW_CHANNEL : DEFAULT_CHANNEL
      const params = new URLSearchParams({
        taskId, nonce, captchaId, captchaOutput, genTime, lotNumber, passToken,
        channel,
      })
      const res = await fetch(`/api/webFetch?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.code !== 0) throw new Error(data.msg || '获取失败')
      const [username, password] = (data.data as string).split('----')
      setResult({ username, password })
    } catch (e: unknown) {
      setError((e as Error).message || '获取失败，请重试')
    } finally {
      setLoading(false)
      pendingFetchRef.current = false
    }
  }, [])

  // When showCaptcha turns true, init geetest
  useEffect(() => {
    if (!showCaptcha) return
    const interval = setInterval(() => {
      const el = document.getElementById('gt-fetch-container')
      if (!el) return
      clearInterval(interval)
      if (typeof initGeetest4 === 'undefined') {
        setShowCaptcha(false)
        setError('验证码组件未加载，请刷新页面')
        setLoading(false)
        return
      }
      initGeetest4({ captchaId: CAPTCHA_ID, product: 'popup' }, (obj) => {
        obj.appendTo('#gt-fetch-container')
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
          const { captchaId, captchaOutput, genTime, lotNumber, passToken } = captchaResRef.current
          doFetch(captchaId, captchaOutput, genTime, lotNumber, passToken)
        })
      })
    }, 200)
    return () => clearInterval(interval)
  }, [showCaptcha, doFetch])

  const handleFetch = useCallback(async () => {
    if (loading || pendingFetchRef.current) return
    setLoading(true)
    setError(null)
    setResult(null)
    captchaResRef.current = null
    pendingFetchRef.current = true

    // Check if captcha can be bypassed
    try {
      const res = await fetch('/api/user/can-bypass-captcha', { credentials: 'include' })
      const data = await res.json()
      if (data.code === 0) {
        // bypass — call directly
        await doFetch('', '', '', '', typeof data.data === 'string' ? data.data : '')
      } else {
        // need captcha
        setShowCaptcha(true)
      }
    } catch {
      // on error, still show captcha
      setShowCaptcha(true)
    }
  }, [loading, doFetch])

  const copyText = async (text: string, key: 'user' | 'pass' | 'all') => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1800)
  }

  const goToConvert = () => {
    if (!result) return
    const params = new URLSearchParams({
      username: result.username,
      password: result.password,
    })
    navigate(`/convert?${params.toString()}`)
  }

  return (
    <div className="fetch-panel">
      <div className="fetch-panel-header">
        <h2 className="fetch-panel-title">获取账号</h2>
        <p className="fetch-panel-sub">点击按钮获取一个可用的 4399 小号</p>
      </div>

      {/* Captcha container (hidden until needed) */}
      {showCaptcha && (
        <div className="captcha-wrapper">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: '0.5rem', textAlign: 'center' }}>
            请完成滑块验证
          </p>
          <div id="gt-fetch-container" />
        </div>
      )}

      {/* Main button */}
      <motion.button
        className="fetch-btn btn btn-primary"
        onClick={handleFetch}
        disabled={loading || showCaptcha}
        whileTap={{ scale: 0.97 }}
      >
        {loading ? (
          <><span className="spinner" /><span>获取中…</span></>
        ) : showCaptcha ? (
          <><span className="spinner" /><span>等待验证…</span></>
        ) : (
          <><span className="fetch-btn-icon">▶</span><span>获取账号</span></>
        )}
      </motion.button>

      <AnimatePresence>
        {error && (
          <motion.div className="alert alert-error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span>✕</span><span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div className="result-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="result-actions">
              <button className="btn btn-primary btn-sm" onClick={goToConvert}>转换 SAuth</button>
              <button className="btn btn-ghost btn-sm" onClick={() => copyText(`${result.username}----${result.password}`, 'all')}>
                {copied === 'all' ? '已复制' : '复制全部'}
              </button>
            </div>
            <div className="result-field">
              <span className="result-field-label">用户名</span>
              <div className="result-field-value">
                <span className="mono">{result.username}</span>
                <button className="copy-btn" onClick={() => copyText(result.username, 'user')}>{copied === 'user' ? '✓' : '⎘'}</button>
              </div>
            </div>
            <div className="result-field">
              <span className="result-field-label">密码</span>
              <div className="result-field-value">
                <span className="mono">{result.password}</span>
                <button className="copy-btn" onClick={() => copyText(result.password, 'pass')}>{copied === 'pass' ? '✓' : '⎘'}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(
        <div className="api-section">
          <div className="api-section-header">
            <span>API Key 接入</span>
            <a href="/profile" className="btn btn-ghost btn-sm">管理 Key →</a>
          </div>
          <p className="api-section-desc">
            在 <a href="/profile">个人中心</a> 申请 API Key，通过 <code className="mono">GET /api/uf/get</code>（带 <code className="mono">x-ciallo</code> 头）程序化获取账号；也可使用 <code className="mono">GET /api/uf/paid-get?amount=数量</code> 进行付费获取。
          </p>
        </div>
      )}
    </div>
  )
}
