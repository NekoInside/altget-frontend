import { motion } from 'framer-motion'
import FetchPanel from '@/components/FetchPanel'
import './Home.css'

export default function Home() {
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
    </div>
  )
}
