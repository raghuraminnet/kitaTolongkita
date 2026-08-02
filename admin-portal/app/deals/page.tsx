'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function DealsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'moderation' | 'all'>('moderation')

  // Moderation tab state
  const [deals, setDeals] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('PendingReview')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectDealId, setRejectDealId] = useState<string | null>(null)

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState('')
  const [bulkReason, setBulkReason] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  // Detail modal
  const [detailDeal, setDetailDeal] = useState<any | null>(null)

  // All deals tab state
  const [appDeals, setAppDeals] = useState<any[]>([])
  const [appTotal, setAppTotal] = useState(0)
  const [appSearch, setAppSearch] = useState('')
  const [appStatus, setAppStatus] = useState('All')
  const [appLoading, setAppLoading] = useState(false)

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    if (tab === 'moderation') loadModeration()
    else loadAppDeals()
  }, [tab, status, page, search])

  const loadModeration = () => {
    setLoading(true)
    const fn = status === 'PendingReview'
      ? api.pendingDeals(page, pageSize)
      : api.allDeals({ status: status === 'All' ? undefined : status, search: search || undefined, page, pageSize })
    fn.then((res: any) => {
      if (res.items) { setDeals(res.items); setTotal(res.totalCount) }
    }).catch(() => {}).finally(() => setLoading(false))
  }

  const loadAppDeals = () => {
    setAppLoading(true)
    api.appDeals({ status: appStatus === 'All' ? undefined : appStatus, search: appSearch || undefined })
      .then((res: any) => {
        setAppDeals(res.data || [])
        setAppTotal(res.total || 0)
      }).catch(() => {}).finally(() => setAppLoading(false))
  }

  const handleApprove = async (id: string) => {
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

  // ── Bulk actions ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === deals.length) setSelected(new Set())
    else setSelected(new Set(deals.map(d => d.id)))
  }

  const handleBulk = async () => {
    if (!bulkAction || selected.size === 0) return
    setBulkLoading(true)
    try {
      const res: any = await api.bulkModerateDeals(Array.from(selected), bulkAction, bulkReason)
      if (res.success) {
        alert(`✅ Done: ${res.data?.succeeded || 0} succeeded, ${res.data?.failed || 0} failed`)
        setSelected(new Set())
        setBulkAction('')
        setBulkReason('')
        loadModeration()
      }
    } catch (err: any) {
      alert(err.message)
    } finally { setBulkLoading(false) }
  }

  const StatusBadge = ({ s }: { s: string }) => {
    const map: Record<string, string> = {
      PendingReview: 'badge-pending', Approved: 'badge-approved', Rejected: 'badge-rejected',
      Active: 'badge-approved', Draft: 'badge-pending', Fulfilled: 'badge-info',
      Cancelled: 'badge-danger', Expired: 'badge-warning',
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
            <button className={`btn btn-sm ${tab === 'moderation' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTab('moderation')}>
              🔍 Moderation Queue
            </button>
            <button className={`btn btn-sm ${tab === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTab('all')}>
              📋 All App Deals
            </button>
          </div>
        </div>

        <div className="page-content">
          {/* ── MODERATION TAB ── */}
          {tab === 'moderation' && (
            <>
              <div className="flex gap-2 mb-4">
                {['PendingReview', 'Approved', 'Rejected', 'All'].map(s => (
                  <button key={s} className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setStatus(s); setPage(1); setSelected(new Set()) }}>
                    {s === 'PendingReview' ? 'Pending' : s}
                  </button>
                ))}
              </div>

              {status !== 'PendingReview' && (
                <div className="search-bar mb-4">
                  <input placeholder="Search deals..." value={search}
                    onChange={e => setSearch(e.target.value)} />
                </div>
              )}

              {loading ? (
                <div className="loading"><div className="spinner" /></div>
              ) : deals.length === 0 ? (
                <div className="empty-state"><div className="icon">🏷️</div><h3>No deals found</h3></div>
              ) : (
                <>
                  {/* Bulk action bar */}
                  {status === 'PendingReview' && (
                    <div className="flex gap-2 mb-4" style={{ alignItems: 'center', padding: '8px 12px', background: '#f5f5f5', borderRadius: 8 }}>
                      <input type="checkbox"
                        checked={selected.size === deals.length && deals.length > 0}
                        onChange={toggleAll}
                        style={{ width: 16, height: 16 }} />
                      <span className="text-sm text-muted">{selected.size} selected</span>
                      {selected.size > 0 && (
                        <>
                          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd' }}>
                            <option value="">Choose action...</option>
                            <option value="approve">✅ Approve Selected</option>
                            <option value="reject">❌ Reject Selected</option>
                            <option value="feature">⭐ Feature Selected</option>
                            <option value="unfeature">☆ Unfeature Selected</option>
                          </select>
                          {bulkAction === 'reject' && (
                            <input placeholder="Rejection reason..."
                              value={bulkReason} onChange={e => setBulkReason(e.target.value)}
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', flex: 1 }} />
                          )}
                          <button className="btn btn-sm btn-primary" onClick={handleBulk} disabled={!bulkAction || bulkLoading}>
                            {bulkLoading ? 'Processing...' : 'Apply'}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div className="card">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            {status === 'PendingReview' && <th style={{ width: 32 }}></th>}
                            <th>Title</th><th>Category</th><th>Organizer</th>
                            <th>Price</th><th>Group</th><th>Status</th>
                            <th>AI Score</th><th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deals.map(deal => (
                            <tr key={deal.id}>
                              {status === 'PendingReview' && (
                                <td>
                                  <input type="checkbox"
                                    checked={selected.has(deal.id)}
                                    onChange={() => toggleSelect(deal.id)}
                                    style={{ width: 16, height: 16 }} />
                                </td>
                              )}
                              <td className="font-bold" style={{ cursor: 'pointer', color: '#0e6a5b' }}
                                onClick={() => setDetailDeal(deal)}>
                                {deal.title}
                              </td>
                              <td>{deal.category}</td>
                              <td>{deal.organizerName}</td>
                              <td>RM{Number(deal.groupPrice).toFixed(2)}</td>
                              <td>{deal.currentGroup}/{deal.minGroup}</td>
                              <td><StatusBadge s={deal.status} /></td>
                              <td>
                                {deal.moderationScore != null ? (
                                  <span
                                    className={deal.moderationScore >= 80 ? 'text-success' : deal.moderationScore >= 50 ? 'text-warning' : 'text-error'}
                                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                    onClick={() => setDetailDeal(deal)}
                                    title="View AI moderation detail"
                                  >
                                    {deal.moderationScore}
                                  </span>
                                ) : '-'}
                              </td>
                              <td>
                                <div className="flex gap-2">
                                  {status === 'PendingReview' && (
                                    <>
                                      <button className="btn btn-sm btn-success" disabled={actionLoading === deal.id}
                                        onClick={() => handleApprove(deal.id)}>
                                        {actionLoading === deal.id ? '...' : '✓'}
                                      </button>
                                      <button className="btn btn-sm btn-danger"
                                        onClick={() => setRejectDealId(deal.id)}>✗</button>
                                    </>
                                  )}
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
            </>
          )}

          {/* ── ALL APP DEALS TAB ── */}
          {tab === 'all' && (
            <>
              <div className="flex gap-2 mb-4">
                {['All', 'Active', 'Draft', 'Fulfilled', 'Cancelled', 'Expired'].map(s => (
                  <button key={s} className={`btn btn-sm ${appStatus === s ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setAppStatus(s)}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="search-bar mb-4">
                <input placeholder="Search deals by title, description, or category..."
                  value={appSearch} onChange={e => setAppSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadAppDeals()} />
                <button className="btn btn-primary btn-sm" onClick={loadAppDeals}>Search</button>
              </div>
              <div className="text-sm text-muted mb-2">{appTotal} deals total</div>
              {appLoading ? (
                <div className="loading"><div className="spinner" /></div>
              ) : appDeals.length === 0 ? (
                <div className="empty-state"><div className="icon">📋</div><h3>No deals found</h3></div>
              ) : (
                <div className="card">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Title</th><th>Category</th><th>Organizer ID</th><th>Price</th><th>Members</th><th>Status</th><th>AI Status</th><th>Upvotes</th><th>Likes</th></tr>
                      </thead>
                      <tbody>
                        {appDeals.map(deal => (
                          <tr key={deal.id}>
                            <td className="font-bold">{deal.title}</td>
                            <td>{deal.category}</td>
                            <td className="text-sm text-muted">{deal.organizerId?.slice(0, 8)}...</td>
                            <td>
                              <span className="text-success font-bold">RM{Number(deal.groupPrice).toFixed(2)}</span>
                              <span className="text-muted text-sm" style={{ textDecoration: 'line-through' }}> RM{Number(deal.originalPrice).toFixed(2)}</span>
                            </td>
                            <td>{deal.membersJoined}/{deal.maxMembers} min:{deal.minMembers}</td>
                            <td><StatusBadge s={deal.status} /></td>
                            <td><StatusBadge s={deal.moderationStatus} /></td>
                            <td>{deal.upvoteCount}</td>
                            <td>{deal.likeCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Reject modal */}
      {rejectDealId && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Reject Deal</div>
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

      {/* Moderation detail modal */}
      {detailDeal && (
        <div className="modal-overlay" onClick={() => setDetailDeal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">🔍 Deal Moderation Detail</div>
              <button className="modal-close" onClick={() => setDetailDeal(null)}>×</button>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <h3 className="font-bold mb-2">{detailDeal.title}</h3>
              <div className="text-sm text-muted mb-4">{detailDeal.description}</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><span className="text-muted text-sm">Category:</span> {detailDeal.category}</div>
                <div><span className="text-muted text-sm">Organizer:</span> {detailDeal.organizerName}</div>
                <div><span className="text-muted text-sm">Organizer Email:</span> {detailDeal.organizerEmail}</div>
                <div><span className="text-muted text-sm">Group Price:</span> RM{Number(detailDeal.groupPrice).toFixed(2)}</div>
                <div><span className="text-muted text-sm">Original Price:</span> <s>RM{Number(detailDeal.originalPrice).toFixed(2)}</s></div>
                <div><span className="text-muted text-sm">Min Group:</span> {detailDeal.minGroup}</div>
                <div><span className="text-muted text-sm">Deadline:</span> {detailDeal.deadline ? new Date(detailDeal.deadline).toLocaleDateString() : '-'}</div>
                <div><span className="text-muted text-sm">Pickup:</span> {detailDeal.pickupLocation || '-'}</div>
              </div>

              {/* AI Score visualization */}
              {detailDeal.moderationScore != null && (
                <div className="mb-4">
                  <div className="text-sm font-bold mb-2">AI Moderation Score</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: detailDeal.moderationScore >= 80 ? '#e8f5e9' : detailDeal.moderationScore >= 50 ? '#fff3e0' : '#ffebee',
                      border: `3px solid ${detailDeal.moderationScore >= 80 ? '#4caf50' : detailDeal.moderationScore >= 50 ? '#ff9800' : '#e53935'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 'bold',
                      color: detailDeal.moderationScore >= 80 ? '#4caf50' : detailDeal.moderationScore >= 50 ? '#ff9800' : '#e53935',
                    }}>
                      {detailDeal.moderationScore}
                    </div>
                    <div>
                      <div className="text-sm">
                        {detailDeal.moderationScore >= 80 ? '✅ Auto-Approve eligible' :
                         detailDeal.moderationScore >= 50 ? '⏳ Manual review needed' :
                         '❌ Auto-Reject eligible'}
                      </div>
                      <div className="text-sm text-muted mt-1">
                        {detailDeal.moderationScore >= 80 ? 'Score ≥ 80 → auto-approved' :
                         detailDeal.moderationScore >= 50 ? 'Score 50-79 → pending review' :
                         'Score < 50 → auto-rejected'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailDeal.moderationReason && (
                <div className="mb-4" style={{ padding: 12, background: '#ffebee', borderRadius: 8 }}>
                  <div className="text-sm font-bold text-error mb-1">Rejection Reason:</div>
                  <div className="text-sm">{detailDeal.moderationReason}</div>
                </div>
              )}

              {detailDeal.hashtags && detailDeal.hashtags.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-muted mb-1">Hashtags:</div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {(Array.isArray(detailDeal.hashtags) ? detailDeal.hashtags : []).map((tag: string) => (
                      <span key={tag} className="badge badge-pending">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-muted mb-4">
                Created: {new Date(detailDeal.createdAt).toLocaleString()}
              </div>

              {status === 'PendingReview' && (
                <div className="flex gap-2">
                  <button className="btn btn-success" disabled={actionLoading === detailDeal.id}
                    onClick={async () => {
                      setActionLoading(detailDeal.id)
                      try { await api.approveDeal(detailDeal.id); setDetailDeal(null); loadModeration() }
                      catch { alert('Failed') }
                      finally { setActionLoading(null) }
                    }}>
                    ✅ Approve
                  </button>
                  <button className="btn btn-danger"
                    onClick={() => { setDetailDeal(null); setRejectDealId(detailDeal.id) }}>
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
