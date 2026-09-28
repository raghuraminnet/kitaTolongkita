'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res: any = await api.login(email, password)
      const token = res?.data?.accessToken || res?.accessToken || res?.token
      const fullName = res?.data?.fullName || res?.fullName || 'Super Admin'
      const role = res?.data?.role || res?.role || 'SuperAdmin'

      if (token) {
        localStorage.setItem('admin_token', token)
        localStorage.setItem(
          'admin_user',
          JSON.stringify({
            fullName,
            role,
          })
        )
        router.push('/dashboard')
      } else {
        setError(res?.message || 'Login failed. Please check your credentials.')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(
        err?.message ||
          'Could not connect to the API server (:5050). Please verify the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCreds = () => {
    setEmail('admin@kitatolongkita.com')
    setPassword('Admin@123')
    setError('')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Top Badge */}
        <div className="login-badge-row">
          <div className="login-badge">
            <ShieldCheck size={14} />
            Executive Admin Console
          </div>
        </div>

        <div className="login-logo">🤝</div>
        <div className="login-title">KitaTolongKita</div>
        <div className="login-sub">Platform Administration & Moderation</div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Admin Email</label>
            <div className="input-with-icon">
              <span className="input-icon">
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kitatolongkita.com"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label>Master Password</label>
            <div className="input-with-icon">
              <span className="input-icon">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              'Authenticating Session...'
            ) : (
              <>
                Sign In to Console
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Fill Helper */}
        <button
          type="button"
          onClick={fillDemoCreds}
          className="quick-fill-btn"
          title="Click to auto-fill default admin credentials"
        >
          <Sparkles size={14} color="#FF7A45" />
          Auto-fill Demo SuperAdmin (Admin@123)
        </button>
      </div>
    </div>
  )
}
