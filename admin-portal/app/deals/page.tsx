'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function DealsPage() {
  const router = useRouter()
  const [deals, setDeals] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('PendingReview')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectDealId, setRejectDealId] = useState<number | null>(null)

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadDeals()
  }, [status, page, search])

  const loadDeals = () => {
    setLoading(true)
    const fn = status === 'PendingReview'
      ? api.pendingDeals(page, pageSize)
      : api.allDeals({ status: status === 'All' ? undefined : status, search: search || undefined, page, pageSize })

    fn.then((res: any) => {
      if (res.items) {
        setDeals(res.items)
        setTotal(res.totalCount)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }

  const handleApprove = async (id: number) => {
    setActionLoading(id)
    try {
      await api.approveDeal(id)
      setDeals(d => d.filter(x => x.id !== id))
      setTotal(t => t - 1)
    } catch { alert('Failed to approve') }
    finally { setActionLoading(null) }
  }

  const handleReject = async () => {
    if (!rejectDealId) return
    setActionLoading(rejectDealId)
    try {
      await api.rejectDeal(rejectDealId, rejectReason)
      setDeals(d => d.filter(x => x.id !== rejectDealId))
      setTotal(t => t - 1)
      setRejectDealId(null)
      setRejectReason('')
    } catch { alert('Failed to reject') }
    finally { setActionLoading(null) }
  }

  const StatusBadge = ({ s }: { s: string }) => {
    const map: Record<string, string> = {
      PendingReview: 'badge-pending',
      Approved: 'badge-approved',
      Rejected: 'badge-rejected',
    }
    return <span className={`badge ${map[s] || 'badge-pending'}`}>{s}</span>
  }

  return (
    <div className="layout">
      <Sidebar pendingCount={status === 'PendingReview' ? total : 0} />
      <main className="main">
        <div className="topbar">
          <div className="page-title">Deal Management</div>
          <div className="flex gap-2">
            {['PendingReview', 'Approved', 'Rejected', 'All'].map(s => (
              <button key={s} className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setStatus(s); setPage(1); }}>
                {s === 'PendingReview' ? 'Pending' : s}
              </button>
            ))}
          </div>
        </div>
        <div className="page-content">
          {status !== 'PendingReview' && (
            <div className="search-bar">
              <input placeholder="Search deals by title..." value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
          )}

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : deals.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🏷️</div>
              <h3>No deals found</h3>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Organizer</th>
                        <th>Price</th>
                        <th>Group</th>
                        <th>Status</th>
                        <th>AI Score</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map(deal => (
                        <tr key={deal.id}>
                          <td>#{deal.id}</td>
                          <td className="font-bold">{deal.title}</td>
                          <td>{deal.category}</td>
                          <td>{deal.organizerName}</td>
                          <td>RM{Number(deal.groupPrice).toFixed(2)}</td>
                          <td>{deal.currentGroup}/{deal.minGroup}</td>
                          <td><StatusBadge s={deal.status} /></td>
                          <td>
                            {deal.moderationScore != null
                              ? <span className={deal.moderationScore >= 80 ? 'text-success' : deal.moderationScore >= 50 ? 'text-warning' : 'text-error'}>{deal.moderationScore}</span>
                              : '-'}
                          </td>
                          <td>
                            <div className="flex gap-2">
                              {status === 'PendingReview' && (
                                <>
                                  <button className="btn btn-sm btn-success" disabled={actionLoading === deal.id}
                                    onClick={() => handleApprove(deal.id)}>
                                    {actionLoading === deal.id ? '...' : '✓ Approve'}
                                  </button>
                                  <button className="btn btn-sm btn-danger"
                                    onClick={() => setRejectDealId(deal.id)}>
                                    ✗ Reject
                                  </button>
                                </>
                              )}
                              <button className="btn btn-sm btn-outline"
                                onClick={() => router.push(`/deals/${deal.id}`)}>
                                View
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
                    return (
                      <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
                    )
                  })}
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {rejectDealId && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Reject Deal #{rejectDealId}</div>
              <button className="modal-close" onClick={() => setRejectDealId(null)}>×</button>
            </div>
            <div className="form-group">
              <label>Reason (optional)</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..." rows={3} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setRejectDealId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={actionLoading === rejectDealId}>
                {actionLoading === rejectDealId ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
