'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  LayoutDashboard,
  Tag,
  AlertTriangle,
  MessageSquare,
  Award,
  Users,
  ShoppingBag,
  Bookmark,
  Bell,
  MessagesSquare,
  Smartphone,
  TrendingUp,
  FolderTree,
  ClipboardList,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { AdminAlertCenter } from './AdminAlertCenter'

interface NavSection {
  title: string
  items: Array<{
    href: string
    label: string
    icon: any
    badgeKey?: 'deals' | 'logs'
  }>
}

const NAV_GROUPS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/stats', label: 'Deal Stats', icon: TrendingUp },
    ],
  },
  {
    title: 'Commerce & Deals',
    items: [
      { href: '/deals', label: 'Deal Moderation', icon: Tag, badgeKey: 'deals' },
      { href: '/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/categories', label: 'Categories', icon: FolderTree },
      { href: '/saved-lists', label: 'Saved Lists', icon: Bookmark },
    ],
  },
  {
    title: 'Community',
    items: [
      { href: '/users', label: 'Users', icon: Users },
      { href: '/contributors', label: 'Contributors', icon: Award },
      { href: '/comments', label: 'Comments', icon: MessageSquare },
      { href: '/reports', label: 'Reports', icon: AlertTriangle },
      { href: '/conversations', label: 'Chat Monitoring', icon: MessagesSquare },
    ],
  },
  {
    title: 'System & Config',
    items: [
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/push-tokens', label: 'Push Tokens', icon: Smartphone },
      { href: '/audit-logs', label: 'Audit Logs', icon: ClipboardList, badgeKey: 'logs' },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function Sidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const [errorCount, setErrorCount] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) return
    api.auditLogsStats()
      .then((res: any) => {
        if (res?.error != null) setErrorCount(res.error)
      })
      .catch(() => {})
  }, [])

  const user = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('admin_user') || '{}')
    : {}

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/')
  }

  const getInitials = (name: string) => {
    if (!name) return 'AD'
    const p = name.trim().split(' ')
    if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-logo flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="logo-badge">
            🤝
          </div>
          <div className="logo-text">
            <span className="logo-title">KitaAdmin</span>
            <span className="logo-sub">Flagship Hub</span>
          </div>
        </div>
        <AdminAlertCenter />
      </div>

      {/* Navigation Groups */}
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="nav-section">{group.title}</div>
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const showPendingDeals = item.badgeKey === 'deals' && pendingCount > 0
              const showErrorBadge = item.badgeKey === 'logs' && errorCount > 0

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="icon">
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  </span>
                  <span>{item.label}</span>

                  {showPendingDeals && (
                    <span className="badge">{pendingCount}</span>
                  )}

                  {showErrorBadge && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: '#EF4444',
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '0 5px',
                      }}
                    >
                      {errorCount > 99 ? '99+' : errorCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Admin User Footer Card */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">
            {getInitials(user.fullName || 'Super Admin')}
          </div>
          <div className="user-details">
            <div className="user-info">{user.fullName || 'Super Admin'}</div>
            <span className="user-role-badge">
              {user.role || 'SUPER ADMIN'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="btn-signout"
            title="Sign out of Admin Portal"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
