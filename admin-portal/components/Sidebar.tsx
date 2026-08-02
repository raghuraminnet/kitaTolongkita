'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/deals', label: 'Deal Moderation', icon: '🏷️', badge: true },
  { href: '/reports', label: 'Reports', icon: '🚩' },
  { href: '/comments', label: 'Comments', icon: '💬' },
  { href: '/users', label: 'Users', icon: '👥' },
  { href: '/orders', label: 'Orders', icon: '📦' },
  { href: '/saved-lists', label: 'Saved Lists', icon: '🔖' },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/conversations', label: 'Chat', icon: '💬' },
  { href: '/push-tokens', label: 'Push Tokens', icon: '📱' },
  { href: '/stats', label: 'Deal Stats', icon: '📈' },
  { href: '/categories', label: 'Categories', icon: '🏷️' },
  { href: '/audit-logs', label: 'Audit Logs', icon: '📋' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export function Sidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()

  const user = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('admin_user') || '{}')
    : {}

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">🤝 KitaAdmin</div>
      <nav className="sidebar-nav">
        <div className="nav-section">Main</div>
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
            {item.badge && pendingCount > 0 && (
              <span className="badge">{pendingCount}</span>
            )}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">{user.fullName || 'Admin'}</div>
        <div className="user-role">{user.role || 'Viewer'}</div>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm mt-2">Sign Out</button>
      </div>
    </aside>
  )
}
