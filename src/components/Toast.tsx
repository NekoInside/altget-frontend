import { AnimatePresence, motion } from 'framer-motion'
import type { ToastItem } from '@/pages/Home'
import './Toast.css'

interface ToastProps {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            className={`toast-item ${t.type === 2 ? 'toast-warn' : 'toast-info'}`}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.22 }}
          >
            <span className="toast-icon">{t.type === 2 ? '⚠' : 'ℹ'}</span>
            {/* dangerouslySetInnerHTML: content is from trusted backend admin only */}
            <span
              className="toast-body"
              dangerouslySetInnerHTML={{ __html: t.context }}
            />
            <button className="toast-close" onClick={() => onDismiss(t.id)}>✕</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
