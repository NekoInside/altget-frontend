import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import {
  getAdminStats, listTokens, generateToken, batchGenerateTokens, deleteToken,
  searchUsers, listUsers, getUserDetail, banUser, unbanUser, adjustCoins
} from '@/api/admin'
import type { AdminStats, TokenEntity, AdminUserDetail, AdminUserSearchResult } from '@/types/api'
import './Admin.css'

export default function Admin() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<'dashboard' | 'tokens' | 'users'>('dashboard')

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 0) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="alert alert-error">权限不足：仅管理员可访问此页面</div>
    </div>
  )

  const TABS = [
    { key: 'dashboard', label: '仪表盘' },
    { key: 'tokens', label: '兑换码管理' },
    { key: 'users', label: '用户管理' },
  ] as const

  return (
    <div className="page admin-page">
      <div className="container-wide admin-shell">
        <motion.div
          className="admin-header"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="admin-title">管理后台</h1>
          <span className="badge badge-yellow">Admin</span>
        </motion.div>

        <div className="admin-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`admin-tab ${tab === t.key ? 'admin-tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {tab === t.key && <motion.span className="admin-tab-bar" layoutId="atab" />}
            </button>
          ))}
        </div>

        <div className="admin-content">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'tokens' && <TokensTab />}
          {tab === 'users' && <UsersTab />}
        </div>
      </div>
    </div>
  )
}

/* ─── Dashboard ────────────────────────────────────────────── */
function DashboardTab() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminStats().then(r => { if (r.code === 0) setStats(r.data) }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="tab-loading"><span className="spinner" /></div>
  if (!stats) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="stats-grid">
        <StatCard icon="👥" label="总用户数" value={stats.totalUsers} color="blue" />
        <StatCard icon="🎫" label="总兑换码" value={stats.totalTokens} color="cyan" />
        <StatCard icon="✅" label="已使用" value={stats.usedTokens} color="green" />
        <StatCard icon="🔖" label="未使用" value={stats.unusedTokens} color="yellow" />
      </div>
    </motion.div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: string; label: string; value: number; color: 'blue' | 'cyan' | 'green' | 'yellow'
}) {
  const colors = {
    blue: 'var(--accent)',
    cyan: 'var(--accent2)',
    green: 'var(--success)',
    yellow: 'var(--warn)',
  }
  return (
    <div className="stat-card card">
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-val mono" style={{ color: colors[color] }}>{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  )
}

/* ─── Tokens ───────────────────────────────────────────────── */
function TokensTab() {
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

  const [tokens, setTokens] = useState<TokenEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all')
  const [genAmount, setGenAmount] = useState('')
  const [genCount, setGenCount] = useState('1')
  const [genLoading, setGenLoading] = useState(false)
  const [genMsg, setGenMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [totalPages, setTotalPages] = useState(1)
  const [jumpInput, setJumpInput] = useState('')
  const [listMsg, setListMsg] = useState<string | null>(null)

  const fetchTokens = async (targetPage: number, size = pageSize, searchKeyword = keyword) => {
    setLoading(true)
    setListMsg(null)
    try {
      const res = await listTokens(filter, targetPage, size, searchKeyword || undefined)
      if (res.code === 0) {
        const nextTotalPages = Math.max(1, Number(res.data?.pages ?? 1))
        if (targetPage > nextTotalPages) {
          setPage(nextTotalPages)
          return
        }
        const list = res.data?.tokens ?? []
        setTokens(list)
        setTotalPages(nextTotalPages)
        if (!list.length) setListMsg(searchKeyword ? '没有匹配的兑换码' : '暂无数据')
      } else {
        setTokens([])
        setTotalPages(1)
        setListMsg(res.msg || (searchKeyword ? '没有匹配的兑换码' : '加载兑换码失败'))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTokens(page)
  }, [filter, page, pageSize, keyword])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseInt(genAmount)
    const count = parseInt(genCount)
    if (!amount || amount <= 0) return
    if (!count || count <= 0) return
    setGenLoading(true)
    setGenMsg(null)
    setCopied(false)
    try {
      const res = count === 1 ? await generateToken(amount) : await batchGenerateTokens(amount, count)
      if (res.code === 0) {
        const tokenList = Array.isArray(res.data)
          ? res.data.map(token => token.tokenId)
          : [res.data.tokenId]
        setGeneratedTokens(tokenList)
        setGenMsg({ type: 'ok', text: `生成成功！共 ${tokenList.length} 个兑换码` })
        setGenAmount('')
        setGenCount('1')
        setPage(1)
        await fetchTokens(1)
      } else {
        setGenMsg({ type: 'err', text: res.msg })
        setGeneratedTokens([])
      }
    } catch {
      setGenMsg({ type: 'err', text: '请求失败' })
      setGeneratedTokens([])
    } finally {
      setGenLoading(false)
    }
  }

  const handleCopyTokens = async () => {
    if (!generatedTokens.length) return
    try {
      await navigator.clipboard.writeText(generatedTokens.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setGenMsg({ type: 'err', text: '复制失败，请手动复制' })
    }
  }

  const handleDelete = async (tokenId: string) => {
    if (!confirm('确定删除此兑换码？')) return
    setDeleting(tokenId)
    try {
      const res = await deleteToken(tokenId)
      if (res.code === 0) {
        await fetchTokens(page)
      }
    } finally {
      setDeleting(null)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const nextKeyword = keywordInput.trim()
    setJumpInput('')
    if (nextKeyword === keyword && page === 1) {
      fetchTokens(1, pageSize, nextKeyword)
      return
    }
    setKeyword(nextKeyword)
    setPage(1)
  }

  const handleResetSearch = () => {
    const shouldFetchDirectly = keyword === '' && page === 1
    setKeywordInput('')
    setKeyword('')
    setPage(1)
    setJumpInput('')
    if (shouldFetchDirectly) fetchTokens(1, pageSize, '')
  }

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize)
    setPage(1)
    setJumpInput('')
  }

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseInt(jumpInput, 10)
    if (!Number.isFinite(target)) return
    setPage(Math.max(1, Math.min(totalPages, target)))
    setJumpInput('')
  }

  const pageControlsDisabled = loading
  const hasKeyword = !!keyword.trim()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Generate form */}
      <div className="card admin-section">
        <h3 className="admin-section-title">生成兑换码</h3>
        <form className="gen-form" onSubmit={handleGenerate}>
          <input
            className="input-field"
            type="number"
            placeholder="金币数量"
            min={1}
            value={genAmount}
            onChange={e => setGenAmount(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="number"
            placeholder="生成数量"
            min={1}
            value={genCount}
            onChange={e => setGenCount(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={genLoading}>
            {genLoading ? <span className="spinner" /> : '生成'}
          </button>
        </form>
        {genMsg && (
          <div className={`alert ${genMsg.type === 'ok' ? 'alert-success' : 'alert-error'}`} style={{ marginTop: '0.75rem' }}>
            <span>{genMsg.type === 'ok' ? '✓' : '✕'}</span>
            <span className="mono" style={{ fontSize: '0.82rem' }}>{genMsg.text}</span>
          </div>
        )}

        {generatedTokens.length > 0 && (
          <div className="generated-token-box">
            <div className="generated-token-header">
              <span className="admin-section-title" style={{ marginBottom: 0 }}>生成结果</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleCopyTokens}>
                {copied ? '已复制' : '复制全部'}
              </button>
            </div>
            <pre className="generated-token-code mono">
              {generatedTokens.join('\n')}
            </pre>
          </div>
        )}
      </div>

      {/* Filter + table */}
      <div className="admin-section">
        <div className="admin-filter">
          {(['all', 'unused', 'used'] as const).map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'filter-btn--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : f === 'unused' ? '未使用' : '已使用'}
            </button>
          ))}
        </div>
        <form className="search-form token-search-form" onSubmit={handleSearch}>
          <input
            className="input-field"
            placeholder="搜索兑换码（Token ID）"
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>搜索</button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleResetSearch}
            disabled={loading || (!keyword && !keywordInput)}
          >
            重置
          </button>
        </form>

        {loading ? (
          <div className="tab-loading"><span className="spinner" /></div>
        ) : tokens.length === 0 ? (
          <p className="empty-hint">{listMsg || (hasKeyword ? '没有匹配的兑换码' : '暂无数据')}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Token ID</th>
                  <th>金额</th>
                  <th>状态</th>
                  <th>兑换人</th>
                  <th>兑换时间</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map(tk => (
                  <tr key={tk.tokenId}>
                    <td><code className="mono" style={{ fontSize: '0.78rem' }}>{tk.tokenId}</code></td>
                    <td><span className="mono" style={{ color: 'var(--warn)' }}>{tk.coinAmount}</span></td>
                    <td>
                      <span className={`badge ${tk.used ? 'badge-green' : 'badge-blue'}`}>
                        {tk.used ? '已使用' : '未使用'}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>{tk.redeemedBy ?? '-'}</td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>{tk.redeemedAt?.split('T')[0] ?? '-'}</td>
                    <td className="mono" style={{ fontSize: '0.78rem' }}>{tk.createdAt?.split('T')[0]}</td>
                    <td>
                      {!tk.used && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(tk.tokenId)}
                          disabled={deleting === tk.tokenId}
                        >
                          {deleting === tk.tokenId ? <span className="spinner" /> : '删除'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (tokens.length > 0 || totalPages > 1) && (
          <div className="user-pagination">
            <label className="user-pagination-size">
              <span className="user-pagination-size-label">每页</span>
              <select
                className="page-size-select"
                value={pageSize}
                onChange={e => handlePageSizeChange(Number(e.target.value))}
                disabled={pageControlsDisabled}
              >
                {PAGE_SIZE_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || pageControlsDisabled}
            >
              上一页
            </button>
            <span className="user-pagination-label mono">第 {page} 页 / 共 {totalPages} 页</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || pageControlsDisabled}
            >
              下一页
            </button>
            <form className="user-pagination-jump" onSubmit={handleJumpToPage}>
              <input
                className="input-field page-jump-input"
                type="number"
                min={1}
                max={totalPages}
                placeholder="页码"
                value={jumpInput}
                onChange={e => setJumpInput(e.target.value)}
                disabled={pageControlsDisabled || totalPages <= 1}
              />
              <button
                type="submit"
                className="btn btn-ghost btn-sm"
                disabled={pageControlsDisabled || totalPages <= 1 || !jumpInput}
              >
                跳转
              </button>
            </form>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Users ────────────────────────────────────────────────── */
function UsersTab() {
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<AdminUserSearchResult[]>([])
  const [selected, setSelected] = useState<AdminUserDetail | null>(null)
  const [searching, setSearching] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [hasSearched, setHasSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [searchPage, setSearchPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTotalPages, setSearchTotalPages] = useState(1)
  const [jumpInput, setJumpInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [adjustForm, setAdjustForm] = useState({ amount: '', reason: '' })
  const [banReason, setBanReason] = useState('')
  const [listMsg, setListMsg] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const fetchUsers = async (targetPage: number, size = pageSize) => {
    setLoadingList(true)
    setListMsg(null)
    try {
      const res = await listUsers(targetPage, size)
      if (res.code === 0) {
        setResults(res.data?.users ?? [])
        setTotalPages(Math.max(1, Number(res.data?.pages ?? 1)))
      } else {
        setResults([])
        setTotalPages(1)
        setListMsg(res.msg || '加载用户列表失败')
      }
    } finally {
      setLoadingList(false)
    }
  }

  const fetchSearchResults = async (searchKeyword: string, targetPage: number, size = pageSize) => {
    setSearching(true)
    setListMsg(null)
    try {
      const res = await searchUsers(searchKeyword, targetPage, size)
      if (res.code === 0) {
        setResults(res.data?.users ?? [])
        setSearchTotalPages(Math.max(1, Number(res.data?.pages ?? 1)))
        if ((res.data?.users?.length ?? 0) === 0) setListMsg('没有找到匹配用户')
      } else {
        setResults([])
        setSearchTotalPages(1)
        setListMsg(res.msg || '没有找到匹配用户')
      }
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (!hasSearched) fetchUsers(page)
  }, [page, hasSearched, pageSize])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = keyword.trim()
    setSelected(null)
    setMsg(null)
    setListMsg(null)
    setBanReason('')

    if (!trimmed) {
      setHasSearched(false)
      setPage(1)
      setSearchPage(1)
      setSearchTotalPages(1)
      return
    }

    if (/^\d+$/.test(trimmed)) {
      setSearching(true)
      setHasSearched(true)
      setResults([])
      setSearchPage(1)
      setSearchTotalPages(1)
      try {
        await selectUser(Number(trimmed))
      } finally {
        setSearching(false)
      }
      return
    }

    setHasSearched(true)
    setSearchPage(1)
    await fetchSearchResults(trimmed, 1)
  }

  useEffect(() => {
    if (!hasSearched) return
    const trimmed = keyword.trim()
    if (!trimmed || /^\d+$/.test(trimmed)) return
    fetchSearchResults(trimmed, searchPage)
  }, [searchPage])

  const handleResetSearch = () => {
    setKeyword('')
    setHasSearched(false)
    setPage(1)
    setSearchPage(1)
    setTotalPages(1)
    setSearchTotalPages(1)
    setSelected(null)
    setMsg(null)
    setListMsg(null)
    setBanReason('')
  }

  const handlePageSizeChange = (nextSize: number) => {
    setPageSize(nextSize)
    setPage(1)
    setSearchPage(1)
  }

  const selectUser = async (userId: number) => {
    setMsg(null)
    setListMsg(null)
    const res = await getUserDetail(userId)
    if (res.code === 0) {
      setSelected(res.data)
      setBanReason('')
    } else {
      setSelected(null)
      setBanReason('')
      setListMsg(res.msg || `未找到用户 #${userId}`)
    }
  }

  const handleBan = async () => {
    if (!selected || !confirm(`确定封禁用户 ${selected.username}？`)) return
    setActionLoading(true)
    setMsg(null)
    try {
      const reason = banReason.trim()
      const res = await banUser(selected.userId, reason)
      if (res.code === 0) {
        setMsg({ type: 'ok', text: '封禁成功' })
        setSelected({ ...selected, role: 3, banReason: reason || 'No reason provided' })
        setBanReason(reason)
      } else {
        setMsg({ type: 'err', text: res.msg })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnban = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      const res = await unbanUser(selected.userId)
      if (res.code === 0) {
        setMsg({ type: 'ok', text: '解封成功' })
        setSelected({ ...selected, role: 2, banReason: null })
        setBanReason('')
      } else {
        setMsg({ type: 'err', text: res.msg })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const amount = parseInt(adjustForm.amount)
    if (isNaN(amount)) return
    setActionLoading(true)
    setMsg(null)
    try {
      const res = await adjustCoins(selected.userId, amount, adjustForm.reason || '管理员调整')
      if (res.code === 0) {
        setMsg({ type: 'ok', text: '金币调整成功' })
        setSelected({ ...selected, coinBalance: selected.coinBalance + amount })
        setAdjustForm({ amount: '', reason: '' })
      } else {
        setMsg({ type: 'err', text: res.msg })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const roleLabel = (role: number) => {
    if (role === 0) return { label: 'Admin', cls: 'badge-yellow' }
    if (role === 1) return { label: '待验证', cls: 'badge-yellow' }
    if (role === 3) return { label: '已封禁', cls: 'badge-red' }
    return { label: '已验证', cls: 'badge-green' }
  }

  const activePage = hasSearched ? searchPage : page
  const activeTotalPages = hasSearched ? searchTotalPages : totalPages
  const pageControlsDisabled = loadingList || searching

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseInt(jumpInput, 10)
    if (!Number.isFinite(target)) return
    const clamped = Math.max(1, Math.min(activeTotalPages, target))
    if (clamped === activePage) {
      setJumpInput('')
      return
    }
    if (hasSearched) setSearchPage(clamped)
    else setPage(clamped)
    setJumpInput('')
  }


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="users-tab">
      {/* User detail */}
      {selected && (
        <div className="card admin-section">
          <div className="user-detail-header">
            <div>
              <h3 className="admin-section-title">{selected.username}</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.3rem' }}>
                <span className={`badge ${roleLabel(selected.role).cls}`}>{roleLabel(selected.role).label}</span>
                <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{selected.email}</span>
              </div>
            </div>
            <div className="user-detail-actions">
              {selected.role !== 3 ? (
                <>
                  <input
                    className="input-field user-ban-reason"
                    placeholder="封禁原因（可选）"
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    disabled={actionLoading}
                  />
                  <button className="btn btn-danger btn-sm" onClick={handleBan} disabled={actionLoading}>
                    封禁
                  </button>
                </>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={handleUnban} disabled={actionLoading}>
                  解封
                </button>
              )}
            </div>
          </div>

          <div className="user-detail-grid">
            <div className="user-detail-item">
              <span className="user-detail-label">User ID</span>
              <span className="mono">{selected.userId}</span>
            </div>
            <div className="user-detail-item">
              <span className="user-detail-label">金币余额</span>
              <span className="mono" style={{ color: 'var(--warn)' }}>{selected.coinBalance}</span>
            </div>
            <div className="user-detail-item">
              <span className="user-detail-label">权限等级</span>
              <span className="mono">Level {selected.level}</span>
            </div>
            {selected.banReason && (
              <div className="user-detail-item">
                <span className="user-detail-label">封禁原因</span>
                <span style={{ color: 'var(--danger)' }}>{selected.banReason}</span>
              </div>
            )}
          </div>

          <hr className="divider" />
          <h4 className="admin-section-title" style={{ marginBottom: '0.75rem' }}>调整金币</h4>
          <form className="adjust-form" onSubmit={handleAdjust}>
            <input
              className="input-field"
              type="number"
              placeholder="数量（正数增加，负数扣除）"
              value={adjustForm.amount}
              onChange={e => setAdjustForm(f => ({ ...f, amount: e.target.value }))}
              required
            />
            <input
              className="input-field"
              placeholder="备注原因"
              value={adjustForm.reason}
              onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
            />
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>调整</button>
          </form>

          {msg && (
            <div className={`alert ${msg.type === 'ok' ? 'alert-success' : 'alert-error'}`} style={{ marginTop: '0.75rem' }}>
              <span>{msg.type === 'ok' ? '✓' : '✕'}</span>
              <span>{msg.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="card admin-section">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            className="input-field"
            placeholder="搜索用户名/邮箱，或直接输入 User ID"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? <span className="spinner" /> : '搜索'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleResetSearch} disabled={!hasSearched && !keyword}>
            全部用户
          </button>
        </form>

        {listMsg && !loadingList && !searching && (
          <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
            <span>✕</span>
            <span>{listMsg}</span>
          </div>
        )}

        {(loadingList && !hasSearched) || (searching && hasSearched && !results.length) ? (
          <div className="tab-loading"><span className="spinner" /></div>
        ) : results.length > 0 ? (
          <>
            <div className="search-results">
              {results.map(u => (
                <button
                  key={u.userId}
                  className={`search-result-item ${selected?.userId === u.userId ? 'search-result-item--active' : ''}`}
                  onClick={() => selectUser(u.userId)}
                >
                  <span className="mono search-result-id">#{u.userId}</span>
                  <span className={`badge ${roleLabel(u.role).cls}`}>{roleLabel(u.role).label}</span>
                  <span className="search-result-name" title={u.username}>{u.username}</span>
                  <span className="search-result-email" title={u.email}>{u.email}</span>
                </button>
              ))}
            </div>
            {!/^\d+$/.test(keyword.trim()) && (
              <div className="user-pagination">
                <label className="user-pagination-size">
                  <span className="user-pagination-size-label">每页</span>
                  <select
                    className="page-size-select"
                    value={pageSize}
                    onChange={e => handlePageSizeChange(Number(e.target.value))}
                    disabled={pageControlsDisabled}
                  >
                    {PAGE_SIZE_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => hasSearched ? setSearchPage(p => Math.max(1, p - 1)) : setPage(p => Math.max(1, p - 1))}
                  disabled={activePage === 1 || pageControlsDisabled}
                >
                  上一页
                </button>
                <span className="user-pagination-label mono">第 {activePage} 页 / 共 {activeTotalPages} 页</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => hasSearched ? setSearchPage(p => Math.min(activeTotalPages, p + 1)) : setPage(p => Math.min(activeTotalPages, p + 1))}
                  disabled={activePage >= activeTotalPages || pageControlsDisabled}
                >
                  下一页
                </button>
                <form className="user-pagination-jump" onSubmit={handleJumpToPage}>
                  <input
                    className="input-field page-jump-input"
                    type="number"
                    min={1}
                    max={activeTotalPages}
                    placeholder="页码"
                    value={jumpInput}
                    onChange={e => setJumpInput(e.target.value)}
                    disabled={pageControlsDisabled || activeTotalPages <= 1}
                  />
                  <button
                    type="submit"
                    className="btn btn-ghost btn-sm"
                    disabled={pageControlsDisabled || activeTotalPages <= 1 || !jumpInput}
                  >
                    跳转
                  </button>
                </form>
              </div>
            )}
          </>
        ) : hasSearched && !listMsg ? (
          <p className="empty-hint">没有找到匹配用户</p>
        ) : null}
      </div>
    </motion.div>
  )
}
