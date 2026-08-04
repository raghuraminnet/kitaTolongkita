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
  auth_login: '🔐',
  auth_register: '📝',
  user_updated: '✏️',
  deal_joined: '🤝',
  comment_posted: '💬',
  lookup_created: '📋',
}

type Tab = 'overview' | 'activity' | 'followers' | 'following'

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [userDetail, setUserDetail] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [followListLoading, setFollowListLoading] = useState(false)

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

  const openUser = (user: any) => {
    setSelectedUser(user)
    setTab('overview')
    setUserDetail(null)
    setRecentActivity([])
    setFollowers([])
    setFollowing([])
    loadUserDetail(user.id)
  }

  const loadUserDetail = (userId: string) => {
    setDetailLoading(true)
    api.appUserById(userId)
      .then((res: any) => {
        if (res.data) setUserDetail(res.data)
        else if (!res.items) setUserDetail(res)
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }

  const loadRecentActivity = (userId: string) => {
    setActivityLoading(true)
    api.recentActivity(userId)
      .then((res: any) => {
        const items = res.items || res.data?.items || []
        setRecentActivity(items)
      })
      .catch(() => {})
      .finally(() => setActivityLoading(false))
  }

  const loadFollowers = (userId: string) => {
    setFollowListLoading(true)
    api.userFollowers(userId)
      .then((res: any) => {
        setFollowers(res.items || res.data || [])
      })
      .catch(() => {})
      .finally(() => setFollowListLoading(false))
  }

  const loadFollowing = (userId: string) => {
    setFollowListLoading(true)
    api.userFollowing(userId)
      .then((res: any) => {
        setFollowing(res.items || res.data || [])
      })
      .catch(() => {})
      .finally(() => setFollowListLoading(false))
  }

  const switchTab = (t: Tab, userId: string) => {
    setTab(t)
    if (t === 'activity' && recentActivity.length === 0) loadRecentActivity(userId)
    if (t === 'followers' && followers.length === 0) loadFollowers(userId)
    if (t === 'following' && following.length === 0) loadFollowing(userId)
  }

  const stats = userDetail?.stats
  const profile = userDetail || selectedUser

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
                      <th>Status</th>
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
                          <span className={`badge ${u.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
                            {u.status || 'Active'}
                          </span>
                        </td>
                        <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="text-sm text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '-'}</td>
                        <td>
                          <button className="btn btn-sm btn-outline" onClick={() => openUser(u)}>
                            View Profile
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

      {/* User detail modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title">
                {profile?.avatarUrl && (
                  <img src={profile.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', marginRight: 10, objectFit: 'cover' }} />
                )}
                👤 {profile?.fullName || profile?.email || selectedUser.email}
              </div>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
              {(['overview', 'activity', 'followers', 'following'] as Tab[]).map(t => (
                <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchTab(t, selectedUser.id)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === 'followers' && stats && <span style={{ marginLeft: 4, opacity: 0.7 }}>({stats.followers})</span>}
                  {t === 'following' && stats && <span style={{ marginLeft: 4, opacity: 0.7 }}>({stats.following})</span>}
                </button>
              ))}
            </div>

            <div style={{ padding: '0 16px 16px' }}>
              {/* ── OVERVIEW TAB ─────────────────────────────────── */}
              {tab === 'overview' && (
                <>
                  {detailLoading ? (
                    <div className="loading" style={{ padding: 40 }}><div className="spinner" /></div>
                  ) : profile ? (
                    <>
                      {/* Bio */}
                      {(profile.bio || profile.city || profile.website) && (
                        <div style={{ padding: '12px 0' }}>
                          {profile.bio && <p className="text-sm" style={{ margin: '4px 0' }}>{profile.bio}</p>}
                          {profile.city && <p className="text-sm text-muted" style={{ margin: '2px 0' }}>📍 {profile.city}</p>}
                          {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: 'var(--color-primary)' }}>{profile.website}</a>}
                        </div>
                      )}

                      {/* Stats grid */}
                      {stats ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                          {[
                            ['🏷️', stats.totalDeals, 'Deals'],
                            ['📋', stats.totalLookups, 'Lookups'],
                            ['🔖', stats.totalSaved, 'Saved'],
                            ['🔁', stats.totalReposts, 'Reposts'],
                            ['📦', stats.totalOrders, 'Orders'],
                            ['👥', stats.followers, 'Followers'],
                            ['➡️', stats.following, 'Following'],
                            ['⭐', profile.isContributor ? 'Yes' : 'No', 'Contributor'],
                          ].map(([icon, val, label]) => (
                            <div key={label} style={{ textAlign: 'center', padding: '10px 8px', background: '#f8f8f8', borderRadius: 8 }}>
                              <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
                              <div style={{ fontSize: 18, fontWeight: 700 }}>{String(val)}</div>
                              <div className="text-xs text-muted">{label}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                          {[
                            ['🏷️', selectedUser.totalDealsPosted || 0, 'Deals'],
                            ['📦', selectedUser.totalOrdersPlaced || 0, 'Orders'],
                            ['🔖', selectedUser.totalSavedDeals || 0, 'Saved'],
                            ['🔔', selectedUser.totalNotificationsReceived || 0, 'Notifs'],
                          ].map(([icon, val, label]) => (
                            <div key={label} style={{ textAlign: 'center', padding: '10px 8px', background: '#f8f8f8', borderRadius: 8 }}>
                              <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
                              <div style={{ fontSize: 18, fontWeight: 700 }}>{String(val)}</div>
                              <div className="text-xs text-muted">{label}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Meta */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ padding: '8px 12px', background: '#f8f8f8', borderRadius: 8 }}>
                          <div className="text-xs text-muted">Email</div>
                          <div className="text-sm">{profile.email}</div>
                        </div>
                        <div style={{ padding: '8px 12px', background: '#f8f8f8', borderRadius: 8 }}>
                          <div className="text-xs text-muted">Phone</div>
                          <div className="text-sm">{profile.phone || '-'}</div>
                        </div>
                        <div style={{ padding: '8px 12px', background: '#f8f8f8', borderRadius: 8 }}>
                          <div className="text-xs text-muted">Email Verified</div>
                          <div className="text-sm">{profile.emailVerified ? '✓ Yes' : '✗ No'}</div>
                        </div>
                        <div style={{ padding: '8px 12px', background: '#f8f8f8', borderRadius: 8 }}>
                          <div className="text-xs text-muted">Account Status</div>
                          <div className="text-sm">{profile.status || 'Active'}</div>
                        </div>
                        <div style={{ padding: '8px 12px', background: '#f8f8f8', borderRadius: 8 }}>
                          <div className="text-xs text-muted">Joined</div>
                          <div className="text-sm">{new Date(profile.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div style={{ padding: '8px 12px', background: '#f8f8f8', borderRadius: 8 }}>
                          <div className="text-xs text-muted">Last Login</div>
                          <div className="text-sm">{profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Never'}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state"><div className="icon">📭</div><h3>No profile data</h3></div>
                  )}
                </>
              )}

              {/* ── ACTIVITY TAB ────────────────────────────────── */}
              {tab === 'activity' && (
                activityLoading ? (
                  <div className="loading" style={{ padding: 40 }}><div className="spinner" /></div>
                ) : recentActivity.length === 0 ? (
                  <div className="empty-state"><div className="icon">📋</div><h3>No activity recorded</h3><p className="text-sm text-muted">Activity will appear here once the user performs actions in the app.</p></div>
                ) : (
                  <div>
                    <p className="text-xs text-muted mb-3">Showing last {recentActivity.length} activity events</p>
                    {recentActivity.map((log: any, i: number) => (
                      <div key={log.id || i} style={{
                        display: 'flex', gap: 12, padding: '10px 0',
                        borderBottom: i < recentActivity.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}>
                        <span style={{ fontSize: 18, width: 28, flexShrink: 0 }}>
                          {ACTIVITY_ICONS[log.action?.toLowerCase()] || '📌'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div className="text-sm font-medium">{log.message || log.action}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                            <span className={`badge badge-${log.level?.toLowerCase() === 'error' ? 'inactive' : log.level?.toLowerCase() === 'warning' ? 'inactive' : 'active'}`}>
                              {log.level}
                            </span>
                            <span className="badge badge-active">{log.category}</span>
                            {log.entityType && <span className="text-xs text-muted">{log.entityType}</span>}
                          </div>
                          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                            {new Date(log.createdAt).toLocaleString()}
                            {log.ipAddress && ` · ${log.ipAddress}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── FOLLOWERS TAB ───────────────────────────────── */}
              {tab === 'followers' && (
                followListLoading ? (
                  <div className="loading" style={{ padding: 40 }}><div className="spinner" /></div>
                ) : followers.length === 0 ? (
                  <div className="empty-state"><div className="icon">👥</div><h3>No followers yet</h3></div>
                ) : (
                  <div>
                    <p className="text-xs text-muted mb-3">{followers.length} followers</p>
                    {followers.map((f: any, i: number) => (
                      <div key={f.followerId || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                        {f.avatarUrl ? (
                          <img src={f.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div className="text-sm font-medium">{f.fullName || 'Unknown'}</div>
                          <div className="text-xs text-muted">Followed {new Date(f.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── FOLLOWING TAB ───────────────────────────────── */}
              {tab === 'following' && (
                followListLoading ? (
                  <div className="loading" style={{ padding: 40 }}><div className="spinner" /></div>
                ) : following.length === 0 ? (
                  <div className="empty-state"><div className="icon">➡️</div><h3>Not following anyone</h3></div>
                ) : (
                  <div>
                    <p className="text-xs text-muted mb-3">{following.length} following</p>
                    {following.map((f: any, i: number) => (
                      <div key={f.followingId || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                        {f.avatarUrl ? (
                          <img src={f.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div className="text-sm font-medium">{f.fullName || 'Unknown'}</div>
                          <div className="text-xs text-muted">Followed {new Date(f.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
