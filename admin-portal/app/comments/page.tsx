'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { MessageSquare, Search } from 'lucide-react'

interface Comment {
  id: string; dealId: string; dealTitle: string
  userId: string; userFullName: string; userAvatar: string | null
  content: string; createdAt: string
  isHidden: boolean; moderationStatus: string
}

const STATUS_MAP: Record<string, string> = {
  Approved: 'badge-approved',
  PendingReview: 'badge-pending',
  Rejected: 'badge-rejected',
}

const STATUS_LABELS: Record<string, string> = {
  Approved: '✅ Approved',
  PendingReview: '⏳ Pending',
  Rejected: '❌ Rejected',
}

export default function CommentsPage() {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadStats()
    loadComments()
  }, [page, statusFilter])

  const loadStats = () => {
    api.commentStats().then((res: any) => setStats(res)).catch(() => {})
  }

  const loadComments = () => {
    setLoading(true)
    api.comments({ status: statusFilter || undefined, page, pageSize })
      .then((res: any) => {
        setComments(res.items || [])
        setTotal(res.totalCount || 0)
      }).catch(() => {}).finally(() => setLoading(false))
  }

  const handleAction = async (id: string, action: 'hide' | 'approve' | 'delete') => {
    if (!confirm(`Are you sure you want to ${action} this comment?`)) return
    setActionLoading(true)
    try {
      if (action === 'hide') await api.hideComment(id)
      else if (action === 'approve') await api.approveComment(id)
      else await api.deleteComment(id)
      loadStats()
      loadComments()
      setSelectedComment(null)
    } catch (e: any) { alert(e.message || 'Action failed') }
    finally { setActionLoading(false) }
  }

  // Client-side search on loaded items
  const displayed = search
    ? comments.filter(c =>
        c.content?.toLowerCase().includes(search.toLowerCase()) ||
        c.userFullName?.toLowerCase().includes(search.toLowerCase()) ||
        c.dealTitle?.toLowerCase().includes(search.toLowerCase())
      )
    : comments

  const statCards = stats ? [
    { label: 'Total', value: stats.total, cls: 'badge-info' },
    { label: 'Pending', value: stats.pendingReview, cls: 'badge-pending' },
    { label: 'Approved', value: stats.approved, cls: 'badge-approved' },
    { label: 'Rejected', value: stats.rejected, cls: 'badge-rejected' },
  ] : []

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="page-title">Comment Moderation</div>
            <div className="text-sm text-muted">Review and moderate user comments on deals</div>
          </div>
          <div className="flex gap-2">
            {['', 'PendingReview', 'Approved', 'Rejected'].map(s => (
              <button key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setStatusFilter(s); setPage(1) }}>
                {s === '' ? 'All' : s === 'PendingReview' ? 'Pending' : s}
              </button>
            ))}
          </div>
        </div>
        <div className="page-content">
          {/* Stats */}
          {statCards.length > 0 && (
            <div className="kpi-grid mb-4">
              {statCards.map(s => (
                <div key={s.label} className="kpi-card">
                  <div className="kpi-label">{s.label}</div>
                  <div className="kpi-value">{s.value ?? 0}</div>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="flex gap-2 mb-4" style={{ alignItems: 'center' }}>
            <div className="search-input-wrap flex-1" style={{ maxWidth: 460 }}>
              <Search size={16} />
              <input
                placeholder="Search by content, user, or deal title..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : displayed.length === 0 ? (
            <div className="empty-state">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <MessageSquare size={42} color="var(--text-muted)" />
              </div>
              <h3>No comments found</h3>
              <p className="text-sm text-muted">No comments match your current filter or search.</p>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Deal</th>
                        <th>Comment</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map(c => (
                        <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedComment(c)}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                              }}>
                                {c.userFullName?.[0]?.toUpperCase() ?? '?'}
                              </div>
                              <div>
                                <div className="font-bold" style={{ fontSize: 13 }}>{c.userFullName}</div>
                                <div className="text-xs text-muted">{c.userId.slice(0, 8)}…</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ maxWidth: 160 }}>
                            <div className="font-bold" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.dealTitle}
                            </div>
                          </td>
                          <td style={{ maxWidth: 280 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260, fontSize: 13 }}>
                              {c.content}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${STATUS_MAP[c.moderationStatus] || 'badge-pending'}`}>
                              {STATUS_LABELS[c.moderationStatus] ?? c.moderationStatus}
                            </span>
                          </td>
                          <td className="text-sm text-muted" style={{ whiteSpace: 'nowrap' }}>
                            {new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td onClick={e => e.stopPropagation()}>
                            <div className="flex gap-2">
                              {c.moderationStatus !== 'Approved' && (
                                <button className="btn btn-sm btn-success"
                                  onClick={() => handleAction(c.id, 'approve')}>
                                  Approve
                                </button>
                              )}
                              {c.moderationStatus === 'Approved' && (
                                <button className="btn btn-sm btn-outline"
                                  onClick={() => handleAction(c.id, 'hide')}>
                                  Hide
                                </button>
                              )}
                              <button className="btn btn-sm btn-danger"
                                onClick={() => handleAction(c.id, 'delete')}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

      {/* Comment Detail Modal */}
      {selectedComment && (
        <div className="modal-overlay" onClick={() => setSelectedComment(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">💬 Comment Detail</div>
              <button className="modal-close" onClick={() => setSelectedComment(null)}>×</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {/* User */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {selectedComment.userFullName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div className="font-bold">{selectedComment.userFullName}</div>
                  <div className="text-sm text-muted">{selectedComment.userId}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span className={`badge ${STATUS_MAP[selectedComment.moderationStatus] || 'badge-pending'}`}>
                    {STATUS_LABELS[selectedComment.moderationStatus] ?? selectedComment.moderationStatus}
                  </span>
                </div>
              </div>

              {/* Deal */}
              <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, marginBottom: 16 }}>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>On deal:</div>
                <div className="font-bold">{selectedComment.dealTitle}</div>
              </div>

              {/* Content */}
              <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 10, marginBottom: 16, lineHeight: 1.6 }}>
                {selectedComment.content}
              </div>

              <div className="text-sm text-muted" style={{ marginBottom: 20 }}>
                Posted: {new Date(selectedComment.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setSelectedComment(null)}>Close</button>
              {selectedComment.moderationStatus !== 'Approved' && (
                <button className="btn btn-success" disabled={actionLoading}
                  onClick={() => handleAction(selectedComment.id, 'approve')}>
                  {actionLoading ? 'Processing...' : '✅ Approve'}
                </button>
              )}
              {selectedComment.moderationStatus === 'Approved' && (
                <button className="btn btn-outline" disabled={actionLoading}
                  onClick={() => handleAction(selectedComment.id, 'hide')}>
                  {actionLoading ? 'Processing...' : 'Hide'}
                </button>
              )}
              <button className="btn btn-danger" disabled={actionLoading}
                onClick={() => handleAction(selectedComment.id, 'delete')}>
                {actionLoading ? 'Processing...' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
