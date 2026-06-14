import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Activate from '@/pages/Activate'
import OAuthCallback from '@/pages/OAuthCallback'
import Profile from '@/pages/Profile'
import Convert from '@/pages/Convert'
import { checkSession, getUserInfo } from '@/api/user'
import { useAuthStore } from '@/store/auth'

function AppInit() {
  const { setUser, setChecked } = useAuthStore()

  useEffect(() => {
    checkSession().then(async (res) => {
      if (res.code === 0) {
        const info = await getUserInfo()
        if (info.code === 0) setUser(info.data)
      }
    }).finally(() => setChecked(true))
  }, [])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <AppInit />
        <Navbar />
        <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/activate" element={<Activate />} />
          <Route path="/github-callback" element={<OAuthCallback provider="github" />} />
          <Route path="/discord-callback" element={<OAuthCallback provider="discord" />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/convert" element={<Convert />} />
          <Route path="*" element={
            <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '4rem', opacity: 0.3 }}>404</div>
              <p style={{ color: 'var(--text-3)' }}>页面不存在</p>
              <a href="/" className="btn btn-ghost">返回首页</a>
            </div>
          } />
        </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
