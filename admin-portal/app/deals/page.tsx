'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Layers, Search, Check, X, Star, Tag, Sparkles } from 'lucide-react'

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
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)

  // All deals tab state
  const [appDeals, setAppDeals] = useState<any[]>([])
  const [appTotal, setAppTotal] = useState(0)
  const [appSearch, setAppSearch] = useState('')
  const [appStatus, setAppStatus] = useState('All')
  const [appLoading, setAppLoading] = useState(false)

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  // Keyboard shortcut listener for rapid single-key moderation
  useEffect(() => {
    if (!detailDeal) return
    setSelectedImageIdx(0)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        handleApproveFromModal(detailDeal.id)
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setRejectDealId(detailDeal.id)
        setDetailDeal(null)
      } else if (e.key === 'Escape') {
        setDetailDeal(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [detailDeal])

  const handleApproveFromModal = async (id: string) => {
    setActionLoading(id)
    try {
      await api.approveDeal(id)
      setDeals(d => d.filter(x => x.id !== id))
      setTotal(t => t - 1)
      setDetailDeal(null)
    } catch { alert('Failed to approve') }
    finally { setActionLoading(null) }
  }

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
        setAppDeals(res.items || res.data || [])
        setAppTotal(res.totalCount || res.total || 0)
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
          <div>
            <div className="page-title">Deal Moderation & Catalog</div>
            <div className="text-sm text-muted">Review, verify, and curate group buy opportunities</div>
          </div>
          <div className="flex gap-2">
            <button className={`btn btn-sm ${tab === 'moderation' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTab('moderation')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={15} /> Moderation Queue
            </button>
            <button className={`btn btn-sm ${tab === 'all' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTab('all')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Layers size={15} /> All App Deals
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
                    {s === 'PendingReview' ? 'Pending Review' : s}
                  </button>
                ))}
              </div>

              {status !== 'PendingReview' && (
                <div className="search-input-wrap mb-4" style={{ maxWidth: 420 }}>
                  <Search size={16} />
                  <input placeholder="Search deals by title..." value={search}
                    onChange={e => setSearch(e.target.value)} />
                </div>
              )}

              {loading ? (
                <div className="loading"><div className="spinner" /></div>
              ) : deals.length === 0 ? (
                <div className="empty-state">
                  <div className="icon" style={{ display: 'flex', justifyContent: 'center' }}>
                    <Tag size={42} color="var(--muted)" />
                  </div>
                  <h3>No deals found</h3>
                  <p className="text-sm text-muted">There are currently no deals in this status filter.</p>
                </div>
              ) : (
                <>
                  {/* Bulk action bar */}
                  {status === 'PendingReview' && (
                    <div className="flex gap-3 mb-4" style={{ alignItems: 'center', padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-sm)' }}>
                      <input type="checkbox"
                        checked={selected.size === deals.length && deals.length > 0}
                        onChange={toggleAll}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{selected.size} of {deals.length} selected</span>
                      {selected.size > 0 && (
                        <>
                          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--canvas)', fontSize: 13 }}>
                            <option value="">Bulk Action...</option>
                            <option value="approve">✓ Approve Selected</option>
                            <option value="reject">✕ Reject Selected</option>
                            <option value="feature">★ Feature Selected</option>
                            <option value="unfeature">☆ Unfeature Selected</option>
                          </select>
                          {bulkAction === 'reject' && (
                            <input placeholder="Rejection reason..."
                              value={bulkReason} onChange={e => setBulkReason(e.target.value)}
                              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', flex: 1, fontSize: 13 }} />
                          )}
                          <button className="btn btn-sm btn-primary" onClick={handleBulk} disabled={!bulkAction || bulkLoading}>
                            {bulkLoading ? 'Processing...' : 'Apply to Selected'}
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
                            {status === 'PendingReview' && <th style={{ width: 36 }}></th>}
                            <th>Title</th><th>Category</th><th>Organizer</th>
                            <th>Price</th><th>Group Target</th><th>Status</th>
                            <th>AI Safety</th><th>Actions</th>
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
                                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                                </td>
                              )}
                              <td className="font-bold" style={{ cursor: 'pointer', color: 'var(--color-primary)' }}
                                onClick={() => setDetailDeal(deal)}>
                                {deal.title}
                              </td>
                              <td><span className="badge badge-inactive" style={{ fontSize: 11 }}>{deal.category}</span></td>
                              <td>{deal.organizerName || '-'}</td>
                              <td className="font-bold" style={{ color: 'var(--color-primary)' }}>RM{Number(deal.groupPrice).toFixed(2)}</td>
                              <td>
                                <span className="text-sm font-semibold">{deal.currentGroup || 0}</span>
                                <span className="text-sm text-muted"> / {deal.minGroup || 1} min</span>
                              </td>
                              <td><StatusBadge s={deal.status} /></td>
                              <td>
                                {deal.moderationScore != null ? (
                                  <span
                                    className={`badge ${deal.moderationScore >= 80 ? 'badge-approved' : deal.moderationScore >= 50 ? 'badge-pending' : 'badge-rejected'}`}
                                    style={{ cursor: 'pointer', fontWeight: 700 }}
                                    onClick={() => setDetailDeal(deal)}
                                    title="View AI moderation score"
                                  >
                                    <Sparkles size={11} style={{ marginRight: 4 }} />
                                    {deal.moderationScore}%
                                  </span>
                                ) : <span className="text-muted text-sm">-</span>}
                              </td>
                              <td>
                                <div className="flex gap-2">
                                  {status === 'PendingReview' ? (
                                    <>
                                      <button className="btn btn-sm btn-success" disabled={actionLoading === deal.id}
                                        onClick={() => handleApprove(deal.id)} title="Approve deal" style={{ padding: '6px 10px' }}>
                                        {actionLoading === deal.id ? '...' : <Check size={14} />}
                                      </button>
                                      <button className="btn btn-sm btn-danger"
                                        onClick={() => setRejectDealId(deal.id)} title="Reject deal" style={{ padding: '6px 10px' }}>
                                        <X size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <button className="btn btn-sm btn-outline" onClick={() => setDetailDeal(deal)} style={{ padding: '4px 10px', fontSize: 12 }}>
                                      Details
                                    </button>
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
              <div className="flex gap-2 mb-4" style={{ alignItems: 'center' }}>
                <div className="search-input-wrap flex-1" style={{ maxWidth: 460 }}>
                  <Search size={16} />
                  <input placeholder="Search deals by title, description, or category..."
                    value={appSearch} onChange={e => setAppSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadAppDeals()} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={loadAppDeals}>Search</button>
              </div>
              <div className="text-sm text-muted mb-2 font-semibold">{appTotal} deals total</div>
              {appLoading ? (
                <div className="loading"><div className="spinner" /></div>
              ) : appDeals.length === 0 ? (
                <div className="empty-state">
                  <div className="icon" style={{ display: 'flex', justifyContent: 'center' }}>
                    <Layers size={42} color="var(--muted)" />
                  </div>
                  <h3>No deals found</h3>
                  <p className="text-sm text-muted">Try adjusting your filters or search keywords.</p>
                </div>
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

      {/* Moderation detail modal — Split Screen AI Inspection Station */}
      {detailDeal && (
        <div className="modal-overlay" onClick={() => setDetailDeal(null)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 940, width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} color="#ff7a30" />
                <span>AI Moderation & Deal Inspection Station</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-pending" style={{ fontSize: 11 }}>
                  Press [A] to Approve • [R] to Reject • [Esc] to Close
                </span>
                <button className="modal-close" onClick={() => setDetailDeal(null)}>×</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.2fr', gap: 24, padding: '0 20px 20px' }}>
              {/* Left Column: Visual & Image Inspection */}
              <div>
                <div style={{
                  borderRadius: 12, overflow: 'hidden', backgroundColor: '#f5f5f5',
                  height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #e0e0e0', position: 'relative', marginBottom: 12
                }}>
                  {detailDeal.imageUrls && detailDeal.imageUrls.length > 0 ? (
                    <img
                      src={detailDeal.imageUrls[selectedImageIdx] || detailDeal.imageUrls[0]}
                      alt={detailDeal.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#9e9e9e' }}>
                      <div style={{ fontSize: 48, marginBottom: 8 }}>🖼️</div>
                      <div className="text-sm font-semibold">No flyer / product image uploaded</div>
                    </div>
                  )}

                  {detailDeal.imageUrls && detailDeal.imageUrls.length > 1 && (
                    <div style={{
                      position: 'absolute', bottom: 8, right: 8,
                      backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 'bold'
                    }}>
                      {selectedImageIdx + 1} / {detailDeal.imageUrls.length}
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {detailDeal.imageUrls && detailDeal.imageUrls.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
                    {detailDeal.imageUrls.map((url: string, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedImageIdx(idx)}
                        style={{
                          width: 56, height: 56, borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                          border: selectedImageIdx === idx ? '2px solid #ff7a30' : '1px solid #e0e0e0',
                          opacity: selectedImageIdx === idx ? 1 : 0.7
                        }}
                      >
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Malaysian Compliance Checklist */}
                <div style={{
                  backgroundColor: '#fbfbfb', border: '1px solid #eaeaea',
                  borderRadius: 12, padding: 14, marginBottom: 12
                }}>
                  <div className="text-xs font-bold text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    🇲🇾 Malaysian Market Compliance
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-xs text-muted">Halal / Dietary:</span>
                      <span style={{
                        fontSize: 11, fontWeight: '700', padding: '2px 8px', borderRadius: 12,
                        backgroundColor: detailDeal.halalStatus === 'JakimCertified' || detailDeal.halalStatus === 'MuslimOwned' ? '#ECFDF5' :
                                         detailDeal.halalStatus === 'PorkFree' ? '#FFFBEB' : '#F3F4F6',
                        color: detailDeal.halalStatus === 'JakimCertified' || detailDeal.halalStatus === 'MuslimOwned' ? '#047857' :
                               detailDeal.halalStatus === 'PorkFree' ? '#B45309' : '#374151',
                        border: '1px solid currentColor'
                      }}>
                        {detailDeal.halalStatus === 'JakimCertified' ? '🟢 Halal JAKIM' :
                         detailDeal.halalStatus === 'MuslimOwned' ? '🟢 Muslim-Owned' :
                         detailDeal.halalStatus === 'PorkFree' ? '🟡 Pork-Free' :
                         detailDeal.halalStatus === 'Vegetarian' ? '🥬 Vegetarian' : 'Tiada / General'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-xs text-muted">Wilayah / State:</span>
                      <span className="text-xs font-bold">
                        📍 {detailDeal.district ? `${detailDeal.district}, ` : ''}{detailDeal.state || 'Selangor'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-xs text-muted">Ringgit Pricing:</span>
                      <span className="text-xs font-bold text-success">
                        RM {Number(detailDeal.groupPrice).toFixed(2)} (Save {Math.round((1 - Number(detailDeal.groupPrice) / Number(detailDeal.originalPrice || detailDeal.groupPrice)) * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Audit & Deal Metadata */}
              <div>
                <h3 className="font-bold text-lg mb-1">{detailDeal.title}</h3>
                <div className="text-sm text-muted mb-3" style={{ maxHeight: 70, overflowY: 'auto' }}>
                  {detailDeal.description || 'No description provided.'}
                </div>

                {/* AI Score Circular Metric Card */}
                <div style={{
                  backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 12, padding: 16, marginBottom: 16
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={18} color="#0e6a5b" />
                      <span className="text-sm font-bold">GPT-4o Vision & Safety Audit</span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: 10 }}>Scored</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
                      background: (detailDeal.moderationScore ?? 85) >= 80 ? '#e8f5e9' : (detailDeal.moderationScore ?? 85) >= 50 ? '#fff3e0' : '#ffebee',
                      border: `3px solid ${(detailDeal.moderationScore ?? 85) >= 80 ? '#4caf50' : (detailDeal.moderationScore ?? 85) >= 50 ? '#ff9800' : '#e53935'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: '800',
                      color: (detailDeal.moderationScore ?? 85) >= 80 ? '#4caf50' : (detailDeal.moderationScore ?? 85) >= 50 ? '#ff9800' : '#e53935',
                    }}>
                      {detailDeal.moderationScore ?? 85}
                    </div>
                    <div>
                      <div className="text-sm font-bold">
                        {(detailDeal.moderationScore ?? 85) >= 80 ? '✅ Pass: Content & Vision Safety Verified' :
                         (detailDeal.moderationScore ?? 85) >= 50 ? '⏳ Review: Borderline confidence, manual check required' :
                         '❌ Danger: Financial scam, loan shark, or policy violation'}
                      </div>
                      <div className="text-xs text-muted mt-1">
                        Screened against: Ah Long • Skim Cepat Kaya • Macau Scam • Harga Cekik Darah • Hate Speech
                      </div>
                    </div>
                  </div>

                  {detailDeal.moderationReason && (
                    <div className="mt-3 text-xs" style={{ padding: 10, background: '#fee2e2', borderRadius: 8, color: '#991b1b' }}>
                      <strong>AI Flag:</strong> {detailDeal.moderationReason}
                    </div>
                  )}
                </div>

                {/* Deal Metadata Grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                  fontSize: 13, marginBottom: 16, backgroundColor: '#fcfcfc',
                  border: '1px solid #f0f0f0', borderRadius: 10, padding: 12
                }}>
                  <div><span className="text-muted">Category:</span> <strong>{detailDeal.category}</strong></div>
                  <div><span className="text-muted">Organizer:</span> <strong>{detailDeal.organizerName}</strong></div>
                  <div><span className="text-muted">Target:</span> <strong>{detailDeal.minMembers || detailDeal.minGroup} to {detailDeal.maxMembers || 100} slots</strong></div>
                  <div><span className="text-muted">Joined:</span> <strong>{detailDeal.membersJoined || 0} members</strong></div>
                  <div><span className="text-muted">Pickup:</span> <strong>{detailDeal.pickupLocation || 'Bangsar, KL'}</strong></div>
                  <div><span className="text-muted">Deadline:</span> <strong>{detailDeal.deadline ? new Date(detailDeal.deadline).toLocaleDateString('en-MY') : '-'}</strong></div>
                </div>

                {detailDeal.hashtags && detailDeal.hashtags.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-muted mb-1">Hashtags:</div>
                    <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                      {(Array.isArray(detailDeal.hashtags) ? detailDeal.hashtags : []).map((tag: string) => (
                        <span key={tag} className="badge badge-pending" style={{ fontSize: 11 }}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Action Footer */}
                <div style={{
                  display: 'flex', gap: 12, paddingTop: 12, borderTop: '1px solid #eee',
                  alignItems: 'center', justifyContent: 'flex-end'
                }}>
                  <button className="btn btn-outline" onClick={() => setDetailDeal(null)}>
                    Cancel [Esc]
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => { setRejectDealId(detailDeal.id); setDetailDeal(null); }}
                  >
                    ❌ Reject [R]
                  </button>
                  <button
                    className="btn btn-success"
                    disabled={actionLoading === detailDeal.id}
                    onClick={() => handleApproveFromModal(detailDeal.id)}
                  >
                    {actionLoading === detailDeal.id ? 'Approving...' : '✅ Approve Deal [A]'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
