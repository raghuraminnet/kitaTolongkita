'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { Send, Smartphone, Bell, CheckCircle2, AlertCircle, RefreshCw, X, Search, Filter } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  deal_approved: 'badge-approved',
  deal_rejected: 'badge-rejected',
  chat_message: 'badge-info',
  verification_reminder: 'badge-pending',
  new_order: 'badge-delivered',
  order_update: 'badge-delivered',
  contributor_application: 'badge-primary',
  admin_message: 'badge-warning',
}

const TYPE_LABELS: Record<string, string> = {
  deal_approved: '✅ Deal Approved',
  deal_rejected: '❌ Deal Rejected',
  chat_message: '💬 Chat Message',
  verification_reminder: '🔔 Verification Reminder',
  new_order: '📦 New Order',
  order_update: '🚚 Order Update',
  contributor_application: '📝 Contributor Application',
  admin_message: '📢 Admin Broadcast',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [type, setType] = useState('')
  const [readFilter, setReadFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [pushStats, setPushStats] = useState<any>(null)

  // Modals
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Broadcast form state
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastRole, setBroadcastRole] = useState('')
  const [broadcastDeepLink, setBroadcastDeepLink] = useState('')

  // Test form state
  const [testToken, setTestToken] = useState('')
  const [testTitle, setTestTitle] = useState('KitaTolongKita Test Alert 🔔')
  const [testBody, setTestBody] = useState('This is a test notification from the KitaTolongKita Admin Portal.')

  const pageSize = 20

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadNotifications()
    loadStats()
    loadPushStats()
  }, [page, type, readFilter])

  const loadNotifications = () => {
    setLoading(true)
    const params: any = { page, pageSize }
    if (type) params.type = type
    if (readFilter === 'read') params.isRead = true
    else if (readFilter === 'unread') params.isRead = false
    api.notifications(params)
      .then((res: any) => {
        const data = res?.data || res
        setNotifications(data?.items || [])
        setTotal(data?.totalCount || data?.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadStats = () => {
    api.notificationStats()
      .then((res: any) => {
        const data = res?.data || res
        setStats(data)
      })
      .catch(() => {})
  }

  const loadPushStats = () => {
    api.pushStats()
      .then((res: any) => {
        const data = res?.data || res
        setPushStats(data)
      })
      .catch(() => {})
  }

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastTitle || !broadcastBody) return
    setSending(true)
    setStatusMessage(null)
    try {
      const res: any = await api.broadcastPush({
        title: broadcastTitle,
        body: broadcastBody,
        targetRole: broadcastRole || undefined,
        data: broadcastDeepLink ? { screen: broadcastDeepLink } : undefined,
      })
      setStatusMessage({ text: res.message || 'Broadcast dispatched successfully!', type: 'success' })
      setBroadcastTitle('')
      setBroadcastBody('')
      setShowBroadcastModal(false)
      loadNotifications()
      loadStats()
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to send broadcast.', type: 'error' })
    } finally {
      setSending(false)
    }
  }

  const handleSendTestPush = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testToken) return
    setSending(true)
    setStatusMessage(null)
    try {
      const res: any = await api.sendTestPush({
        token: testToken,
        title: testTitle,
        body: testBody,
      })
      if (res.success) {
        setStatusMessage({ text: 'Test notification sent successfully!', type: 'success' })
        setShowTestModal(false)
      } else {
        setStatusMessage({ text: `Delivery failed: ${res.message}`, type: 'error' })
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error sending test push.', type: 'error' })
    } finally {
      setSending(false)
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      n.title?.toLowerCase().includes(s) ||
      n.body?.toLowerCase().includes(s) ||
      n.userName?.toLowerCase().includes(s) ||
      n.userEmail?.toLowerCase().includes(s)
    )
  })

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="page-title flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            <span>Push Notifications & Broadcasts</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTestModal(true)}
              className="btn btn-outline btn-sm flex items-center gap-1.5"
            >
              <Smartphone size={15} />
              <span>Test Push Token</span>
            </button>

            <button
              onClick={() => setShowBroadcastModal(true)}
              className="btn btn-primary btn-sm flex items-center gap-1.5"
            >
              <Send size={15} />
              <span>Send Broadcast</span>
            </button>
          </div>
        </div>

        <div className="page-content">
          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg mb-4 flex items-center justify-between text-sm ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusMessage.text}</span>
              </div>
              <button onClick={() => setStatusMessage(null)} className="text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
          )}

          {/* KPI Analytics Grid */}
          <div className="kpi-grid mb-6">
            <div className="kpi-card">
              <div className="kpi-icon">📬</div>
              <div className="kpi-value">{stats?.total ?? 0}</div>
              <div className="kpi-label">Total Notifications</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon">🔴</div>
              <div className="kpi-value">{stats?.unread ?? 0}</div>
              <div className="kpi-label">Unread by Users</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon">📱</div>
              <div className="kpi-value">{pushStats?.activeTokens ?? 0}</div>
              <div className="kpi-label">Active Push Devices</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon">🤖</div>
              <div className="kpi-value">{pushStats?.androidCount ?? 0} / {pushStats?.iosCount ?? 0}</div>
              <div className="kpi-label">Android / iOS Active</div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search size={15} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search notification title, message, or recipient..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input input-sm w-full pl-9"
                  style={{ backgroundColor: '#18181f', borderColor: 'rgba(255,255,255,0.08)' }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={type}
                onChange={e => { setType(e.target.value); setPage(1) }}
                className="select select-sm text-xs"
                style={{ backgroundColor: '#18181f', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <option value="">All Types</option>
                <option value="deal_approved">Deal Approved</option>
                <option value="deal_rejected">Deal Rejected</option>
                <option value="order_update">Order Update</option>
                <option value="chat_message">Chat Message</option>
                <option value="contributor_application">Contributor Application</option>
                <option value="admin_message">Admin Broadcast</option>
              </select>

              <div className="flex gap-1 bg-zinc-900/80 p-1 rounded-md border border-white/5">
                <button
                  className={`btn btn-xs ${readFilter === '' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setReadFilter('')}
                >
                  All
                </button>
                <button
                  className={`btn btn-xs ${readFilter === 'unread' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setReadFilter('unread')}
                >
                  Unread
                </button>
                <button
                  className={`btn btn-xs ${readFilter === 'read' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setReadFilter('read')}
                >
                  Read
                </button>
              </div>

              <button onClick={loadNotifications} className="btn btn-outline btn-sm p-1.5" title="Refresh">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Notifications Table / List */}
          {loading ? (
            <div className="loading py-12"><div className="spinner" /></div>
          ) : filteredNotifications.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-4xl mb-3">🔔</div>
              <h3 className="font-semibold text-lg text-white">No notifications found</h3>
              <p className="text-sm text-zinc-500 mt-1">Notifications dispatched to users will appear here.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="divide-y divide-white/5">
                {filteredNotifications.map(n => (
                  <div
                    key={n.id}
                    className="p-4 flex items-start gap-4 transition-colors hover:bg-white/[0.02]"
                    style={{ opacity: n.isRead ? 0.75 : 1 }}
                  >
                    <div className="pt-0.5">
                      <span className={`badge ${TYPE_COLORS[n.type] || 'badge-info'}`}>
                        {TYPE_LABELS[n.type] || n.type}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-white">{n.title}</span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Unread" />
                        )}
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed">{n.body}</p>

                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-2">
                        <span>User: <strong>{n.userName || 'User'}</strong> ({n.userEmail || n.userId})</span>
                        <span>•</span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}
                  </span>
                  <div className="pagination">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                      return <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
                    })}
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Broadcast Campaign Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-xl shadow-2xl p-6"
            style={{ backgroundColor: '#18181f', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-primary" />
                <h3 className="font-bold text-lg text-white">Compose Push Broadcast</h3>
              </div>
              <button onClick={() => setShowBroadcastModal(false)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Target Audience</label>
                <select
                  value={broadcastRole}
                  onChange={e => setBroadcastRole(e.target.value)}
                  className="select w-full"
                  style={{ backgroundColor: '#121216', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <option value="">All Active Devices (Full Broadcast)</option>
                  <option value="contributor">Verified Contributors Only</option>
                  <option value="user">Regular Shoppers Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Notification Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flash Deals Alert! 🔥"
                  value={broadcastTitle}
                  onChange={e => setBroadcastTitle(e.target.value)}
                  className="input w-full"
                  style={{ backgroundColor: '#121216', borderColor: 'rgba(255,255,255,0.1)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Notification Message *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter the alert content delivered to user lock screens..."
                  value={broadcastBody}
                  onChange={e => setBroadcastBody(e.target.value)}
                  className="input w-full"
                  style={{ backgroundColor: '#121216', borderColor: 'rgba(255,255,255,0.1)', height: 'auto' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Tap Action (Deep Link)</label>
                <select
                  value={broadcastDeepLink}
                  onChange={e => setBroadcastDeepLink(e.target.value)}
                  className="select w-full"
                  style={{ backgroundColor: '#121216', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <option value="">Home Screen (Default)</option>
                  <option value="Search">Explore / Search Screen</option>
                  <option value="Orders">Orders Screen</option>
                  <option value="Profile">Profile / Contributor Hub</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>{sending ? 'Dispatching...' : 'Send Broadcast Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Push Token Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-xl shadow-2xl p-6"
            style={{ backgroundColor: '#18181f', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-warning" />
                <h3 className="font-bold text-lg text-white">Test Push Notification</h3>
              </div>
              <button onClick={() => setShowTestModal(false)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendTestPush} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Expo / FCM Push Token *</label>
                <input
                  type="text"
                  required
                  placeholder="ExponentPushToken[xxxxxxxxxxxxxx] or FCM token"
                  value={testToken}
                  onChange={e => setTestToken(e.target.value)}
                  className="input w-full font-mono text-xs"
                  style={{ backgroundColor: '#121216', borderColor: 'rgba(255,255,255,0.1)' }}
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Find active tokens on the <a href="/push-tokens" className="text-primary hover:underline">Push Tokens</a> page.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={e => setTestTitle(e.target.value)}
                  className="input w-full"
                  style={{ backgroundColor: '#121216', borderColor: 'rgba(255,255,255,0.1)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Body</label>
                <textarea
                  rows={2}
                  value={testBody}
                  onChange={e => setTestBody(e.target.value)}
                  className="input w-full"
                  style={{ backgroundColor: '#121216', borderColor: 'rgba(255,255,255,0.1)', height: 'auto' }}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="btn btn-warning btn-sm flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>{sending ? 'Sending...' : 'Send Test Notification'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
