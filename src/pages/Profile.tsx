import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import type { UserInfo, ApiKeyInfo, PasskeyItem, CoinBalance } from '@/types/api'
import { getUserInfo, getCoinBalance, redeemToken as redeemTokenAPI, transferCoins, BIND_GITHUB_URL, BIND_DISCORD_URL } from '@/api/user'
import { getApiKeyInfo, generateNewApiKey } from '@/api/apikey'
import { listPasskeys, deletePasskey, getPasskeyRegisterOptions, verifyPasskeyRegister } from '@/api/misc'
import { getPowTask } from '@/services/pow'
import { parseRegistrationCreationOptions, serializeRegistrationCredential } from '@/utils/webauthn'
import { getApiMessage } from '@/utils/apiMessage'
import { Navigate } from 'react-router-dom'
import './Profile.css'

const CAPTCHA_ID = '9589c1ac7f7819298973eabdd6365fcf'

type UserInfoDef = UserInfo

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const [tab, setTab] = useState<'overview' | 'coins' | 'apikey' | 'security'>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserInfo().then(r => {
      if (r.code === 0) setUser(r.data)
    }).finally(() => setLoading(false))
  }, [])

  if (!user && !loading) return <Navigate to="/login" replace />
  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  const roleLabel = (role?: number) => {
    if (role === 0) return { label: 'Admin', cls: 'badge-yellow' }
    if (role === 1) return { label: '待验证', cls: 'badge-yellow' }
    if (role === 3) return { label: '已封禁', cls: 'badge-red' }
    return { label: '已验证', cls: 'badge-green' }
  }

  const rl = roleLabel(user?.role as number | undefined)

  const TABS = [
    { key: 'overview', label: '概览' },
    { key: 'coins', label: '钱包' },
    { key: 'apikey', label: 'API Key' },
    { key: 'security', label: '安全' },
  ] as const

  return (
    <div className="page profile-page">
      <div className="container profile-shell">
        {/* Profile header */}
        <motion.div
          className="profile-header"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="profile-avatar">
            {user?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="profile-identity">
            <h1 className="profile-name">{user?.username}</h1>
            <div className="profile-meta">
              <span className={`badge ${rl.cls}`}>{rl.label}</span>
              <span className="profile-email mono">{user?.email}</span>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="profile-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`profile-tab ${tab === t.key ? 'profile-tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {tab === t.key && <motion.span className="profile-tab-bar" layoutId="ptab" />}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="profile-content">
          {tab === 'overview' && <OverviewTab user={user!} />}
          {tab === 'coins' && <CoinsTab user={user!} />}
          {tab === 'apikey' && <ApiKeyTab />}
          {tab === 'security' && <SecurityTab user={user!} />}
        </div>
      </div>
    </div>
  )
}

/* ─── Overview tab ─────────────────────────────────────────── */
function OverviewTab({ user }: { user: UserInfoDef }) {
  const socialLinks = [
    { key: 'github', bound: user.githubBound, label: 'GitHub', href: BIND_GITHUB_URL, icon: '⌥' },
    { key: 'discord', bound: user.discordBound, label: 'Discord', href: BIND_DISCORD_URL, icon: '◈' },
  ]

  return (
    <motion.div
      className="tab-pane anim-fade-up"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <div className="info-grid">
        <InfoRow label="用户名" value={user.username} mono />
        <InfoRow label="邮箱" value={user.email} mono />
        <InfoRow label="注册时间" value={user.registerTime?.split('T')[0]} />
        <InfoRow label="最近使用" value={user.lastUseTime ? user.lastUseTime.split('T')[0] : '从未'} />
      </div>

      <hr className="divider" />

      <h3 className="section-title">已绑定账号</h3>
      <div className="social-bindings">
        {socialLinks.map(s => (
          <div key={s.key} className={`social-binding ${s.bound ? 'social-binding--bound' : ''}`}>
            <span className="social-binding-icon">{s.icon}</span>
            <div>
              <div className="social-binding-name">{s.label}</div>
              <div className="social-binding-status">{s.bound ? '已绑定' : '未绑定'}</div>
            </div>
            {!s.bound && (
              <a href={s.href} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
                绑定
              </a>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── API Key tab ──────────────────────────────────────────── */
function ApiKeyTab() {
  const [info, setInfo] = useState<ApiKeyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [genLoading, setGenLoading] = useState(false)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const captchaResRef = useRef<{
    captchaId: string; captchaOutput: string; genTime: string; lotNumber: string; passToken: string
  } | null>(null)

  useEffect(() => {
    getApiKeyInfo().then(r => {
      if (r.code === 0) setInfo(r.data)
    }).finally(() => setLoading(false))
  }, [])

  const copy = async () => {
    if (!info?.key) return
    await navigator.clipboard.writeText(info.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  useEffect(() => {
    if (!showCaptcha) return
    const interval = setInterval(() => {
      const el = document.getElementById('gt-container-apikey')
      if (!el) return
      clearInterval(interval)
      if (typeof initGeetest4 === 'undefined') {
        setShowCaptcha(false)
        setGenLoading(false)
        setErr('验证码组件未加载，请刷新页面')
        return
      }
      initGeetest4({ captchaId: CAPTCHA_ID, product: 'popup' }, (obj) => {
        obj.appendTo('#gt-container-apikey')
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
          createApiKey()
        })
      })
    }, 200)
    return () => clearInterval(interval)
  }, [showCaptcha])

  const regen = () => {
    setErr(null)
    setGenLoading(true)
    captchaResRef.current = null
    if (typeof initGeetest4 === 'undefined') {
      setErr('验证码组件未加载，请刷新页面')
      setGenLoading(false)
      return
    }
    setShowCaptcha(true)
  }

  const createApiKey = async () => {
    if (!captchaResRef.current) return
    try {
      const { taskId, nonce } = await getPowTask('new-api')
      const res = await generateNewApiKey({
        taskId,
        result: nonce,
        ...captchaResRef.current,
      })
      if (res.code === 0) {
        setInfo(res.data)
      } else {
        setErr(getApiMessage(res, '生成失败'))
      }
    } catch {
      setErr('请求失败')
    } finally {
      setGenLoading(false)
    }
  }

  if (loading) return <div className="tab-loading"><span className="spinner" /></div>

  return (
    <motion.div className="tab-pane" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h3 className="section-title">API Key 管理</h3>

      {info ? (
        <>
          <div className="key-display">
            <code className="mono key-value">{info.key}</code>
            <button className="copy-btn" onClick={copy}>{copied ? '✓' : '⎘'}</button>
          </div>
          <div className="key-stats">
            <KeyStat label="今日使用" value={info.dailyUsage} />
            <KeyStat label="权限等级" value={`Level ${info.userTier}`} />
          </div>
        </>
      ) : (
        <div className="alert alert-info">暂无 API Key，点击下方按钮生成。</div>
      )}

      {err && <div className="alert alert-error"><span>✕</span><span>{err}</span></div>}

      {showCaptcha && (
        <div className="captcha-wrapper" style={{ marginTop: '0.75rem' }}>
          <div id="gt-container-apikey" />
        </div>
      )}

      <div className="alert alert-warn" style={{ marginTop: '0.75rem' }}>
        <span>⚠️</span>
        <span>重新生成将立即使旧 Key 失效。</span>
      </div>

      <button className="btn btn-primary" onClick={regen} disabled={genLoading || showCaptcha} style={{ marginTop: '1rem' }}>
        {genLoading ? <><span className="spinner" /> 生成中…</> : showCaptcha ? '请完成验证…' : info ? '重新生成 Key' : '生成 API Key'}
      </button>

      <hr className="divider" />
      <h4 className="section-subtitle">使用说明 — 获取账号</h4>
      <div className="code-block">
        <pre className="mono">{`GET /api/alt?userApiKey={你的 API Key}\n\nGET /api/alt?userApiKey={你的 API Key}&paid=true&count=数量`}</pre>
      </div>
      <p className="section-desc">免费调用仅支持默认单条返回；付费调用可通过 <code className="mono">count</code> 批量获取。返回数据为字符串数组，每项格式为 <code className="mono">username----password</code>。</p>

      <hr className="divider" />
      <h4 className="section-subtitle">使用说明 — SAuth 转换</h4>
      <div className="code-block">
        <pre className="mono">{`GET /api/alt/convert/sauth?userApiKey={你的 API Key}&username={4399用户名}&password={密码}\n\nGET /api/alt/convert/gen?userApiKey={你的 API Key}`}</pre>
      </div>
      <p className="section-desc"><code className="mono">convert/sauth</code> 将指定账号密码转换为 SAuth Token，返回 <code className="mono">data</code> 为 Token 字符串。<code className="mono">convert/gen</code> 获取一个账号并自动转换，返回 <code className="mono">{"{ username, password, sauth }"}</code>。</p>
    </motion.div>
  )
}

function KeyStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="key-stat">
      <span className="key-stat-val mono">{value}</span>
      <span className="key-stat-key">{label}</span>
    </div>
  )
}

/* ─── Coins tab ────────────────────────────────────────────── */
function CoinsTab({ user }: { user: UserInfo }) {
  const [balance, setBalance] = useState<number>(user.coinBalance ?? 0)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Redeem Tab
  const [redeemToken, setRedeemToken] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  // Transfer Tab
  const [recipient, setRecipient] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferring, setTransferring] = useState(false)

  // View Tab
  const [viewTab, setViewTab] = useState<'balance' | 'redeem' | 'transfer'>('balance')

  const loadData = async () => {
    setLoading(true)
    try {
      const balRes = await getCoinBalance()
      if (balRes.code === 0) {
        setBalance(balRes.data.balance)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRedeem = async () => {
    if (!redeemToken.trim()) {
      setMsg({ type: 'err', text: '请输入兑换码' })
      return
    }

    setRedeeming(true)
    setMsg(null)
    const prevBalance = balance
    try {
      const res = await redeemTokenAPI(redeemToken.trim())
      if (res.code === 0) {
        setRedeemToken('')
        // Refresh balance after successful redemption
        const balRes = await getCoinBalance()
        if (balRes.code === 0) {
          setBalance(balRes.data.balance)
          const gained = balRes.data.balance - prevBalance
          setMsg({ type: 'ok', text: `兑换成功！获得 ${gained} coins` })
        } else {
          setMsg({ type: 'ok', text: '兑换成功！' })
        }
        await loadData()
      } else {
        setMsg({ type: 'err', text: getApiMessage(res, '兑换失败') })
      }
    } catch (e) {
      setMsg({ type: 'err', text: '兑换请求失败' })
    } finally {
      setRedeeming(false)
    }
  }

  const handleTransfer = async () => {
    if (!recipient.trim()) {
      setMsg({ type: 'err', text: '请输入收款人用户名' })
      return
    }
    if (!transferAmount || isNaN(parseInt(transferAmount))) {
      setMsg({ type: 'err', text: '请输入有效的转账数量' })
      return
    }
    const amount = parseInt(transferAmount)
    if (amount <= 0) {
      setMsg({ type: 'err', text: '转账数量必须大于 0' })
      return
    }
    if (amount > balance) {
      setMsg({ type: 'err', text: '余额不足' })
      return
    }

    setTransferring(true)
    setMsg(null)
    try {
      const res = await transferCoins(recipient.trim(), amount)
      if (res.code === 0) {
        setRecipient('')
        setTransferAmount('')
        // Refresh balance
        const balRes = await getCoinBalance()
        if (balRes.code === 0) setBalance(balRes.data.balance)
        setMsg({ type: 'ok', text: `转账成功！已向 ${recipient} 转账 ${amount} coins` })
      } else {
        setMsg({ type: 'err', text: getApiMessage(res, '转账失败') })
      }
    } catch (e) {
      setMsg({ type: 'err', text: '转账请求失败' })
    } finally {
      setTransferring(false)
    }
  }

  const VIEW_TABS = [
    { key: 'balance', label: '余额' },
    { key: 'redeem', label: '兑换' },
    { key: 'transfer', label: '转账' },
  ] as const

  return (
    <motion.div className="tab-pane" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Message */}
      {msg && (
        <div className={`alert ${msg.type === 'ok' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '0.85rem' }}>
          <span>{msg.type === 'ok' ? '✓' : '✕'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {/* View Tabs */}
      <div className="coin-view-tabs">
        {VIEW_TABS.map(t => (
          <button
            key={t.key}
            className={`coin-view-tab ${viewTab === t.key ? 'coin-view-tab--active' : ''}`}
            onClick={() => {
              setViewTab(t.key)
              setMsg(null)
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Balance View */}
      {viewTab === 'balance' && (
        <div className="coin-card">
          {loading ? (
            <div className="tab-loading"><span className="spinner" /></div>
          ) : (
            <>
              <div className="balance-display">
                <div className="balance-label">当前余额</div>
                <div className="balance-value">{balance}</div>
                <div className="balance-unit">coins</div>
              </div>
              <button className="btn btn-primary" onClick={() => loadData()} style={{ marginTop: '1rem' }}>
                刷新
              </button>
            </>
          )}
        </div>
      )}

      {/* Redeem View */}
      {viewTab === 'redeem' && (
        <div className="coin-card">
          <h3 className="section-title">使用兑换码</h3>
          <input
            type="text"
            placeholder="输入兑换码"
            value={redeemToken}
            onChange={(e) => setRedeemToken(e.target.value)}
            className="coin-input"
            disabled={redeeming}
          />
          <button
            className="btn btn-primary"
            onClick={handleRedeem}
            disabled={redeeming || !redeemToken.trim()}
            style={{ marginTop: '0.75rem' }}
          >
            {redeeming ? <><span className="spinner" /> 兑换中…</> : '兑换'}
          </button>
          <p className="section-desc" style={{ marginTop: '0.85rem' }}>输入有效的兑换码以获取 coins</p>
        </div>
      )}

      {/* Transfer View */}
      {viewTab === 'transfer' && (
        <div className="coin-card">
          <h3 className="section-title">转账</h3>
          <div className="coin-form-group">
            <label className="coin-label">收款人用户名</label>
            <input
              type="text"
              placeholder="输入收款人用户名"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="coin-input"
              disabled={transferring}
            />
          </div>
          <div className="coin-form-group">
            <label className="coin-label">转账数量</label>
            <input
              type="number"
              placeholder="输入转账数量"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="coin-input"
              disabled={transferring}
              min="1"
            />
            <div className="coin-hint">当前余额: {balance} coins</div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleTransfer}
            disabled={transferring || !recipient.trim() || !transferAmount}
            style={{ marginTop: '0.75rem' }}
          >
            {transferring ? <><span className="spinner" /> 转账中…</> : '转账'}
          </button>
        </div>
      )}
    </motion.div>
  )
}

/* ─── Security tab ─────────────────────────────────────────── */
function SecurityTab({ user }: { user: UserInfoDef }) {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [registering, setRegistering] = useState(false)
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [passkeyMsg, setPasskeyMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadPasskeys = async () => {
    setLoading(true)
    try {
      const r = await listPasskeys()
      if (r.code === 0) {
        setPasskeys(r.data ?? [])
      } else {
        setPasskeyMsg({ type: 'err', text: getApiMessage(r, '加载 Passkey 列表失败') })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPasskeySupported(typeof window !== 'undefined' && !!window.PublicKeyCredential && window.isSecureContext)
    loadPasskeys()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此 Passkey？')) return
    setDeleting(id)
    setPasskeyMsg(null)
    try {
      const res = await deletePasskey(id)
      if (res.code === 0) {
        setPasskeys(pk => pk.filter(p => p.id !== id))
      } else {
        setPasskeyMsg({ type: 'err', text: getApiMessage(res, '删除 Passkey 失败') })
      }
    } finally {
      setDeleting(null)
    }
  }

  const handleRegisterPasskey = async () => {
    if (!passkeySupported) {
      setPasskeyMsg({ type: 'err', text: '当前浏览器或环境不支持 Passkey，请使用 HTTPS 和支持 WebAuthn 的浏览器。' })
      return
    }

    setRegistering(true)
    setPasskeyMsg(null)
    try {
      const optRes = await getPasskeyRegisterOptions()
      if (optRes.code !== 0) throw new Error(getApiMessage(optRes, '获取 Passkey 注册参数失败'))

      const { challengeId, options } = optRes.data
      const creationOptions = parseRegistrationCreationOptions(options)
      const credential = await navigator.credentials.create(creationOptions)

      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error('浏览器未返回有效的 Passkey 凭据')
      }

      const res = await verifyPasskeyRegister(challengeId, serializeRegistrationCredential(credential), `${user.username} Passkey`)
      if (res.code !== 0) throw new Error(getApiMessage(res, 'Passkey 注册失败'))

      setPasskeyMsg({ type: 'ok', text: 'Passkey 注册成功' })
      await loadPasskeys()
    } catch (e: unknown) {
      const err = e as Error
      if (err.name === 'NotAllowedError') {
        setPasskeyMsg({ type: 'err', text: 'Passkey 注册已取消或超时' })
      } else {
        setPasskeyMsg({ type: 'err', text: err.message || 'Passkey 注册失败' })
      }
    } finally {
      setRegistering(false)
    }
  }

  return (
    <motion.div className="tab-pane" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h3 className="section-title">Passkey / 安全密钥</h3>
      <p className="section-desc" style={{ marginBottom: '0.85rem' }}>通过 WebAuthn Passkey 实现无密码安全登录。</p>

      {passkeyMsg && (
        <div className={`alert ${passkeyMsg.type === 'ok' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '0.85rem' }}>
          <span>{passkeyMsg.type === 'ok' ? '✓' : '✕'}</span>
          <span>{passkeyMsg.text}</span>
        </div>
      )}

      {!passkeySupported && (
        <div className="alert alert-warn" style={{ marginBottom: '0.85rem' }}>
          <span>⚠️</span>
          <span>Passkey 注册需要 HTTPS 安全上下文和支持 WebAuthn 的浏览器。</span>
        </div>
      )}

      {loading ? (
        <div className="tab-loading"><span className="spinner" /></div>
      ) : passkeys.length === 0 ? (
        <p className="empty-hint">暂无注册的 Passkey</p>
      ) : (
        <div className="passkey-list">
          {passkeys.map(pk => (
            <div key={pk.id} className="passkey-item">
              <span className="passkey-icon">🔑</span>
              <div>
                <div className="passkey-name">{pk.name}</div>
                <div className="passkey-date">创建于 {pk.createdAt?.split('T')[0]}</div>
              </div>
              <button
                className="btn btn-danger btn-sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => handleDelete(pk.id)}
                disabled={deleting === pk.id}
              >
                {deleting === pk.id ? <span className="spinner" /> : '删除'}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-ghost"
        style={{ marginTop: '1rem' }}
        onClick={handleRegisterPasskey}
        disabled={!passkeySupported || registering}
      >
        {registering ? <><span className="spinner" /> 注册中…</> : '+ 添加 Passkey'}
      </button>

      <hr className="divider" />
      <h3 className="section-title">密码与账号安全</h3>
      <div className="info-grid">
        <InfoRow label="账号邮箱" value={user.email} mono />
      </div>
      <a href="/forgot-password" className="btn btn-ghost" style={{ marginTop: '0.75rem' }}>
        重置密码
      </a>
    </motion.div>
  )
}

/* ─── Shared sub-components ────────────────────────────────── */
function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className={`info-value ${mono ? 'mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}
