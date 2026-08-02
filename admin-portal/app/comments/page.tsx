'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

const STATUS_COLORS: Record<string, string> = {
  Approved: '#4CAF50',
  PendingReview: '#FF9800',
  Rejected: '#E53935',
}
const STATUS_LABEL: Record<string, string> = {
  Approved: '✅ Approved',
  PendingReview: '⏳ Pending Review',
  Rejected: '❌ Rejected',
}

interface Comment {
  id: string; dealId: string; dealTitle: string
  userId: string; userFullName: string; userAvatar: string | null
  content: string; createdAt: string
  isHidden: boolean; moderationStatus: string
}

export default function CommentsPage() {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
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
    api.comments({ status: statusFilter || undefined, page, pageSize }).then((res: any) => {
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

  const statCards = stats
    ? [
        { label: 'Total Comments', value: stats.total },
        { label: 'Pending Review', value: stats.pendingReview, color: '#FF9800' },
        { label: 'Approved', value: stats.approved, color: '#4CAF50' },
        { label: 'Rejected', value: stats.rejected, color: '#E53935' },
      ]
    : []

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: '#f5f5f5' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>💬 Comment Moderation</h1>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>Review and moderate user comments on deals</p>
          </div>
        </div>

        {/* Stats */}
        {statCards.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {statCards.map((s) => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#666', marginBottom: 4 }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: s.color ?? '#1a1a1a' }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14 }}>
              <option value="">All Statuses</option>
              <option value="PendingReview">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            {statusFilter && (
              <button onClick={() => { setStatusFilter(''); setPage(1) }}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e53935', color: '#e53935', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['User', 'Deal', 'Content', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#444', fontSize: 12, borderBottom: '1px solid #eee' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</td></tr>
              ) : comments.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#999' }}>No comments found</td></tr>
              ) : (
                comments.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#666' }}>
                          {c.userFullName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: 13 }}>{c.userFullName}</div>
                          <div style={{ fontSize: 11, color: '#999' }}>{c.userId.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 160 }}>
                      <div style={{ color: '#1a1a1a', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.dealTitle}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 280 }}>
                      <div style={{ color: '#333', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                        {c.content}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: (STATUS_COLORS[c.moderationStatus] ?? '#999') + '22', color: STATUS_COLORS[c.moderationStatus] ?? '#999' }}>
                        {STATUS_LABEL[c.moderationStatus] ?? c.moderationStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#666', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.moderationStatus !== 'Approved' && (
                          <button onClick={() => handleAction(c.id, 'approve')}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #4CAF50', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#4CAF50', fontWeight: 600 }}>
                            Approve
                          </button>
                        )}
                        {c.moderationStatus === 'Approved' && (
                          <button onClick={() => handleAction(c.id, 'hide')}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #FF9800', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#FF9800', fontWeight: 600 }}>
                            Hide
                          </button>
                        )}
                        <button onClick={() => handleAction(c.id, 'delete')}
                          style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e53935', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#e53935', fontWeight: 600 }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e0e0e0', background: page === 1 ? '#f5f5f5' : '#fff', cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? '#ccc' : '#333' }}>←</button>
              <span style={{ fontSize: 13, color: '#666' }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e0e0e0', background: page === totalPages ? '#f5f5f5' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', color: page === totalPages ? '#ccc' : '#333' }}>→</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
