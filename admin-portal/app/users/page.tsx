'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

const ACTIVITY_ICONS: Record<string, string> = {
  deal_posted: '🏷️',
  order_placed: '📦',
  deal_saved: '🔖',
  notification: '🔔',
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [timeline, setTimeline] = useState<any | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadUsers()
  }, [search])

  const loadUsers = () => {
    setLoading(true)
    api.appUsers({ search: search || undefined })
      .then((res: any) => {
        setUsers(res.data || [])
        setTotal(res.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const openTimeline = (user: any) => {
    setSelectedUser(user)
    setTimeline(null)
    setTimelineLoading(true)
    api.userActivity(user.id)
      .then((res: any) => {
        if (res.success) setTimeline(res.data)
      })
      .catch(() => {})
      .finally(() => setTimelineLoading(false))
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">App Users</div>
          <div className="text-sm text-muted">{total} registered users</div>
        </div>
        <div className="page-content">
          <div className="search-bar mb-4">
            <input placeholder="Search by email or name..." value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadUsers()} />
            <button className="btn btn-primary btn-sm" onClick={loadUsers}>Search</button>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state"><div className="icon">👥</div><h3>No users found</h3></div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Verified</th>
                      <th>Active</th>
                      <th>Joined</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="font-bold">{u.fullName || '-'}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || '-'}</td>
                        <td>
                          <span className={`badge ${u.emailVerified ? 'badge-active' : 'badge-inactive'}`}>
                            {u.emailVerified ? '✓ Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.isActive ? 'badge-active' : 'badge-inactive'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="text-sm text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '-'}</td>
                        <td>
                          <button className="btn btn-sm btn-outline" onClick={() => openTimeline(u)}>
                            View Timeline
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* User activity timeline modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title">👤 {selectedUser.fullName || selectedUser.email}</div>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>×</button>
            </div>

            {timelineLoading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : timeline ? (
              <>
                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 16px 16px' }}>
                  <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{timeline.totalDealsPosted}</div>
                    <div className="text-sm text-muted">Deals Posted</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{timeline.totalOrdersPlaced}</div>
                    <div className="text-sm text-muted">Orders Placed</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{timeline.totalSavedDeals}</div>
                    <div className="text-sm text-muted">Deals Saved</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{timeline.totalNotificationsReceived}</div>
                    <div className="text-sm text-muted">Notifs</div>
                  </div>
                </div>

                <div className="text-sm text-muted mb-2 px-4" style={{ paddingLeft: 16 }}>
                  {selectedUser.email} · Joined {new Date(timeline.createdAt).toLocaleDateString()}
                </div>

                {timeline.activities.length === 0 ? (
                  <div className="empty-state"><div className="icon">📭</div><h3>No activity yet</h3></div>
                ) : (
                  <div style={{ padding: '0 16px 16px' }}>
                    {timeline.activities.map((a: any, i: number) => (
                      <div key={i} style={{
                        display: 'flex', gap: 12, padding: '10px 0',
                        borderBottom: i < timeline.activities.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}>
                        <span style={{ fontSize: 18, width: 28, flexShrink: 0 }}>
                          {ACTIVITY_ICONS[a.type] || '📌'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div className="text-sm">{a.summary}</div>
                          <div className="text-sm text-muted">{new Date(a.at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state"><div className="icon">📭</div><h3>No timeline data</h3></div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
