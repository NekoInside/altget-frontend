import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { getUsedAlts, exportUsedAlts } from '@/api/history'
import { getApiMessage } from '@/utils/apiMessage'
import { trackEvent } from '@/utils/tracker'
import type { UsedAlt } from '@/types/api'
import './UsedAlts.css'

const PAGE_SIZE = 20

export default function UsedAlts() {
  const { user } = useAuthStore()

  const [records, setRecords] = useState<UsedAlt[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters (applied on submit / reset, not on every keystroke).
  const [channel, setChannel] = useState('')
  const [username, setUsername] = useState('')
  const [activeChannel, setActiveChannel] = useState<string | undefined>()
  const [activeUsername, setActiveUsername] = useState<string | undefined>()

  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [msg, setMsg] = useState<{ type: 'err' | 'success' | 'info'; text: string } | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async (targetPage: number, fChannel?: string, fUsername?: string) => {
    setLoading(true)
    try {
      const res = await getUsedAlts({
        page: targetPage,
        size: PAGE_SIZE,
        channel: fChannel || undefined,
        username: fUsername || undefined,
      })
      if (res.code === 0 && res.data) {
        setRecords(res.data.records ?? [])
        setPage(res.data.current)
        setPages(res.data.pages)
        setTotal(res.data.total)
      } else {
        setMsg({ type: 'err', text: getApiMessage(res, '加载使用记录失败') })
      }
    } catch {
      setMsg({ type: 'err', text: '网络错误，请稍后重试' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!user) return <Navigate to="/login" replace />

  const applyFilters = () => {
    const trimmedChannel = channel.trim()
    const trimmedUsername = username.trim()
    setActiveChannel(trimmedChannel || undefined)
    setActiveUsername(trimmedUsername || undefined)
    setPage(1)
    trackEvent('used_alts_filter', { channel: !!trimmedChannel, username: !!trimmedUsername })
    load(1, trimmedChannel, trimmedUsername)
  }

  const resetFilters = () => {
    setChannel('')
    setUsername('')
    setActiveChannel(undefined)
    setActiveUsername(undefined)
    setPage(1)
    load(1)
  }

  const gotoPage = (next: number) => {
    const target = Math.max(1, Math.min(next, pages))
    if (target === page) return
    setRevealed({})
    load(target, activeChannel, activeUsername)
  }

  const toggleReveal = (id: number) =>
    setRevealed(prev => ({ ...prev, [id]: !prev[id] }))

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMsg({ type: 'success', text: '已复制到剪贴板' })
      setTimeout(() => setMsg(null), 1800)
    } catch {
      setMsg({ type: 'err', text: '复制失败' })
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setMsg(null)
    trackEvent('used_alts_export_click')
    try {
      const res = await exportUsedAlts()
      if (res.ok) {
        setMsg({ type: 'success', text: '导出成功，请查看下载' })
        trackEvent('used_alts_export_success')
      } else {
        setMsg({ type: 'err', text: res.message })
        trackEvent('used_alts_export_error', { error: res.message })
      }
    } catch {
      setMsg({ type: 'err', text: '网络错误，请稍后重试' })
      trackEvent('used_alts_export_error', { error: 'network' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page used-alts-page">
      <div className="container">
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="used-alts-header">
            <div>
              <h2 className="section-title">使用记录</h2>
              <p className="used-alts-subtitle">共 {total} 条记录 · 每天可导出一次</p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleExport}
              disabled={exporting || loading || records.length === 0}
            >
              {exporting ? <><span className="spinner" /> 导出中…</> : '⬇ 导出 CSV'}
            </button>
          </div>

          <div className="used-alts-filters">
            <input
              className="input-field"
              placeholder="按渠道筛选"
              value={channel}
              onChange={e => setChannel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyFilters() }}
            />
            <input
              className="input-field"
              placeholder="按用户名筛选"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyFilters() }}
            />
            <button className="btn btn-primary btn-sm" onClick={applyFilters} disabled={loading}>筛选</button>
            <button className="btn btn-ghost btn-sm" onClick={resetFilters} disabled={loading}>重置</button>
          </div>

          {msg && (
            <div className={`alert ${msg.type === 'success' ? 'alert-success' : msg.type === 'info' ? 'alert-info' : 'alert-error'}`}>
              <span>{msg.type === 'success' ? '✓' : msg.type === 'info' ? 'ℹ' : '✕'}</span>
              <span>{msg.text}</span>
            </div>
          )}

          {loading ? (
            <div className="tab-loading"><span className="spinner" /></div>
          ) : records.length === 0 ? (
            <p className="empty-hint">暂无使用记录</p>
          ) : (
            <>
              <div className="used-alts-table-wrap">
                <table className="used-alts-table">
                  <thead>
                    <tr>
                      <th>用户名</th>
                      <th>密码</th>
                      <th>渠道</th>
                      <th>获取方式</th>
                      <th>获取时间</th>
                      <th className="used-alts-actions-col">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(alt => (
                      <tr key={alt.id}>
                        <td className="mono">{alt.username || '—'}</td>
                        <td className="mono used-alts-password">
                          {revealed[alt.id] ? alt.password : '••••••••'}
                        </td>
                        <td>
                          {alt.channel ? <span className="badge badge-green">{alt.channel}</span> : <span className="used-alts-muted">—</span>}
                        </td>
                        <td className="used-alts-muted">{alt.fetchMethod || '—'}</td>
                        <td className="used-alts-muted">{formatTime(alt.fetchTime)}</td>
                        <td className="used-alts-actions-col">
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleReveal(alt.id)}>
                            {revealed[alt.id] ? '隐藏' : '显示'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => copy(`${alt.username}----${alt.password}`)}>
                            复制
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pages > 1 && (
                <div className="used-alts-pagination">
                  <button className="btn btn-ghost btn-sm" onClick={() => gotoPage(page - 1)} disabled={page <= 1}>
                    ‹ 上一页
                  </button>
                  <span className="used-alts-page-info mono">{page} / {pages}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => gotoPage(page + 1)} disabled={page >= pages}>
                    下一页 ›
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function formatTime(raw: string): string {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString('zh-CN', { hour12: false })
}
