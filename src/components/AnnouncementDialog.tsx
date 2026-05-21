import { AnimatePresence, motion } from 'framer-motion'
import type { Announcement } from '@/types/api'
import './AnnouncementDialog.css'

interface Props {
  announcement: Announcement | null
  onClose: () => void
}

export default function AnnouncementDialog({ announcement, onClose }: Props) {
  return (
    <AnimatePresence>
      {announcement && (
        <>
          <motion.div
            className="ann-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="ann-dialog-wrap">
            <motion.div
              className="ann-dialog card"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="ann-header">
                <span className="ann-title">公告</span>
                <button className="ann-close" onClick={onClose} aria-label="关闭">✕</button>
              </div>
              <div className="ann-divider" />
              <div
                className="ann-body"
                dangerouslySetInnerHTML={{ __html: announcement.context }}
              />
              <div className="ann-footer">
                <button className="btn btn-primary ann-ok" onClick={onClose}>我知道了</button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
