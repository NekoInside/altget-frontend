import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAnnouncements } from '@/api/misc'
import type { Announcement } from '@/types/api'
import FetchPanel from '@/components/FetchPanel'
import Toast from '@/components/Toast'
import AnnouncementDialog from '@/components/AnnouncementDialog'
import './Home.css'

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface ToastItem {
  id: number
  type: 1 | 2
  context: string
}

export default function Home() {
  const [dialogAnnouncement, setDialogAnnouncement] = useState<Announcement | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastIdRef = useRef(0)

  useEffect(() => {
    getAnnouncements().then(async r => {
      if (r.code !== 0 || !r.data) return
      for (const a of r.data) {
        if (a.id === 1) {
          // Deduplicate by content hash, 7-day TTL
          const hash = await sha256Hex(a.context)
          const storedHash = localStorage.getItem('announcement_hash')
          const storedTime = Number(localStorage.getItem('announcement_time') ?? 0)
          const sevenDays = 7 * 24 * 60 * 60 * 1000
          if (storedHash !== hash || Date.now() - storedTime > sevenDays) {
            setDialogAnnouncement(a)
            localStorage.setItem('announcement_hash', hash)
            localStorage.setItem('announcement_time', String(Date.now()))
          }
        } else {
          const id = ++toastIdRef.current
          setToasts(prev => [...prev, { id, type: a.type, context: a.context }])
          // Auto-dismiss after 20s
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
          }, 20000)
        }
      }
    })
  }, [])

  return (
    <div className="home-page page">
      <div className="home-center">
        <motion.div
          className="home-card card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          <FetchPanel />
        </motion.div>
      </div>

      {/* Toast notifications (non-id-1 announcements) */}
      <Toast toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* Modal dialog for id=1 announcement */}
      <AnnouncementDialog
        announcement={dialogAnnouncement}
        onClose={() => setDialogAnnouncement(null)}
      />
    </div>
  )
}
