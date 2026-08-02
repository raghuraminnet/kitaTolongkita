'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

const TYPE_COLORS: Record<string, string> = {
  deal_approved: 'badge-approved',
  deal_rejected: 'badge-rejected',
  chat_message: 'badge-info',
  verification_reminder: 'badge-pending',
  new_order: 'badge-delivered',
}

const TYPE_LABELS: Record<string, string> = {
  deal_approved: '✅ Deal Approved',
  deal_rejected: '❌ Deal Rejected',
  chat_message: '💬 Chat Message',
  verification_reminder: '🔔 Verification Reminder',
  new_order: '📦 New Order',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [type, setType] = useState('')
  const [readFilter, setReadFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const pageSize = 20

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadNotifications()
    loadStats()
  }, [page, type, readFilter])

  const loadNotifications = () => {
    setLoading(true)
    const params: any = { page, pageSize }
    if (type) params.type = type
    if (readFilter === 'read') params.isRead = true
    else if (readFilter === 'unread') params.isRead = false
    api.notifications(params)
      .then((res: any) => {
        if (res.success && res.data) {
          setNotifications(res.data.items || [])
          setTotal(res.data.totalCount || 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadStats = () => {
    api.notificationStats()
      .then((res: any) => { if (res.success) setStats(res.data) })
      .catch(() => {})
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">🔔 Notifications</div>
          <div className="flex gap-2">
            <button className={`btn btn-sm ${readFilter === '' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setReadFilter('')}>All</button>
            <button className={`btn btn-sm ${readFilter === 'unread' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setReadFilter('unread')}>Unread</button>
            <button className={`btn btn-sm ${readFilter === 'read' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setReadFilter('read')}>Read</button>
          </div>
        </div>
        <div className="page-content">
          {/* Stats overview */}
          {stats && (
            <div className="kpi-grid mb-4">
              <div className="kpi-card">
                <div className="kpi-icon">📬</div>
                <div className="kpi-value">{stats.total}</div>
                <div className="kpi-label">Total</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon">🔴</div>
                <div className="kpi-value">{stats.unread}</div>
                <div className="kpi-label">Unread</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon">✅</div>
                <div className="kpi-value">{stats.read}</div>
                <div className="kpi-label">Read</div>
              </div>
            </div>
          )}

          {/* Type filter */}
          <div className="search-bar mb-4">
            <select value={type} onChange={e => { setType(e.target.value); setPage(1) }}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
              <option value="">All Types</option>
              <option value="deal_approved">Deal Approved</option>
              <option value="deal_rejected">Deal Rejected</option>
              <option value="chat_message">Chat Message</option>
              <option value="verification_reminder">Verification Reminder</option>
              <option value="new_order">New Order</option>
            </select>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : notifications.length === 0 ? (
            <div className="empty-state"><div className="icon">🔔</div><h3>No notifications</h3></div>
          ) : (
            <>
              <div className="card">
                {notifications.map(n => (
                  <div key={n.id} style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    opacity: n.isRead ? 0.7 : 1,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div className="flex gap-2 mb-1" style={{ alignItems: 'center' }}>
                        <span className={`badge ${TYPE_COLORS[n.type] || 'badge-pending'}`}>
                          {TYPE_LABELS[n.type] || n.type}
                        </span>
                        {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e53935', display: 'inline-block' }} />}
                      </div>
                      <div className="font-bold">{n.title}</div>
                      <div className="text-sm text-muted">{n.body}</div>
                      <div className="text-sm text-muted mt-1">
                        To: <strong>{n.userName || '-'}</strong> ({n.userEmail})
                        {' · '}{new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                    return <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
                  })}
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
