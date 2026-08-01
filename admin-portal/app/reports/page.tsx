'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

const STATUS_COLORS: Record<string, string> = {
  New: '#FF9800',
  UnderReview: '#2196F3',
  ActionTaken: '#9C27B0',
  Dismissed: '#9E9E9E',
  Resolved: '#4CAF50',
}
const STATUS_LABEL: Record<string, string> = {
  New: 'New',
  UnderReview: 'Under Review',
  ActionTaken: 'Action Taken',
  Dismissed: 'Dismissed',
  Resolved: 'Resolved',
}

const ACTION_COLORS: Record<string, string> = {
  None: '#9E9E9E',
  DealHidden: '#E53935',
  UserWarned: '#FB8C00',
  PostingRevoked: '#F57C00',
  AccountSuspended: '#D32F2F',
  AccountBanned: '#B71C1C',
}

function formatReason(r: string) {
  return r.replace(/([A-Z])/g, ' $1').trim()
}

export default function ReportsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionNote, setActionNote] = useState('')
  const [selectedAction, setSelectedAction] = useState('None')
  const [detailLoading, setDetailLoading] = useState(false)

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadStats()
    loadReports()
  }, [page, statusFilter, typeFilter])

  const loadStats = () => {
    api.reportStats().then((res: any) => setStats(res)).catch(() => {})
  }

  const loadReports = () => {
    setLoading(true)
    api.reports({
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      page,
      pageSize,
    }).then((res: any) => {
      setReports(res.items || [])
      setTotal(res.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  const openDetail = async (id: string) => {
    setDetailLoading(true)
    setSelectedReport(null)
    try {
      const res: any = await api.reportById(id)
      setSelectedReport(res)
    } catch { alert('Could not load report details') }
    finally { setDetailLoading(false) }
  }

  const handleAction = async () => {
    if (!selectedReport) return
    setActionLoading(true)
    try {
      await api.reportTakeAction(selectedReport.id, { action: selectedAction, notes: actionNote || undefined })
      alert('Action taken successfully')
      setSelectedReport(null)
      setSelectedAction('None')
      setActionNote('')
      loadStats()
      loadReports()
    } catch (e: any) { alert(e.message || 'Action failed') }
    finally { setActionLoading(false) }
  }

  const handleDismiss = async (id: string) => {
    if (!confirm('Dismiss this report without taking action?')) return
    try {
      await api.reportUpdateStatus(id, { status: 'Dismissed' })
      loadStats()
      loadReports()
    } catch (e: any) { alert(e.message) }
  }

  const statCards = stats
    ? [
        { label: 'Total Reports', value: stats.total },
        { label: 'New', value: stats.newCount, color: '#FF9800' },
        { label: 'Under Review', value: stats.underReviewCount, color: '#2196F3' },
        { label: 'Resolved (7d)', value: stats.resolvedThisWeek, color: '#4CAF50' },
      ]
    : []

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: '#f5f5f5' }}>
      <Sidebar active="reports" />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>Reports</h1>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>Review and act on user-submitted reports</p>
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
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14 }}>
              <option value="">All Statuses</option>
              {api.reportStatuses.map(s => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
            </select>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14 }}>
              <option value="">All Types</option>
              {api.reportTypes.map(t => <option key={t} value={t}>{t === 'Deal' ? 'Deal Reports' : 'User Reports'}</option>)}
            </select>
            {(statusFilter || typeFilter) && (
              <button onClick={() => { setStatusFilter(''); setTypeFilter(''); setPage(1) }}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e53935', color: '#e53935', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Reporter', 'Type', 'Target', 'Reasons', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#444', fontSize: 12, borderBottom: '1px solid #eee' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#999' }}>No reports found</td></tr>
              ) : (
                reports.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{r.reporterName ?? '—'}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>{r.reporterId?.slice(0, 8)}…</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: r.type === 'Deal' ? '#e3f2fd' : '#fce4ec',
                        color: r.type === 'Deal' ? '#1565c0' : '#c2185b',
                      }}>
                        {r.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 180 }}>
                      <div style={{ fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.targetTitle ?? r.targetId?.slice(0, 8) + '…'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {r.reasons?.slice(0, 2).map((reason: string) => (
                          <span key={reason} style={{ padding: '2px 8px', background: '#f5f5f5', borderRadius: 10, fontSize: 11, color: '#555' }}>
                            {formatReason(reason)}
                          </span>
                        ))}
                        {r.reasons?.length > 2 && <span style={{ fontSize: 11, color: '#999' }}>+{r.reasons.length - 2}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: (STATUS_COLORS[r.status] ?? '#999') + '22', color: STATUS_COLORS[r.status] ?? '#999' }}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#666', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openDetail(r.id)}
                          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e0e0e0', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1565c0' }}>
                          Review
                        </button>
                        {r.status === 'New' && (
                          <button onClick={() => handleDismiss(r.id)}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e0e0e0', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#999' }}>
                            Dismiss
                          </button>
                        )}
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

      {/* Detail Modal */}
      {selectedReport && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
        }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                  {selectedReport.type === 'Deal' ? '🏷️' : '👤'} Report — {selectedReport.type}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#999' }}>
                  Filed {new Date(selectedReport.createdAt).toLocaleString('en-GB')} · ID: {selectedReport.id.slice(0, 8)}…
                </p>
              </div>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            {/* Reporter */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reported By</p>
              <p style={{ margin: 0, fontWeight: 600, color: '#1a1a1a' }}>{selectedReport.reporterName ?? '—'}</p>
            </div>

            {/* Target */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target {selectedReport.type}</p>
              <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#1a1a1a', fontSize: 15 }}>
                {selectedReport.targetTitle ?? '—'}
              </p>
              {selectedReport.dealGroupPrice != null && (
                <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Price: RM{selectedReport.dealGroupPrice}</p>
              )}
              {selectedReport.dealPickupLocation && (
                <p style={{ margin: 0, fontSize: 13, color: '#666' }}>📍 {selectedReport.dealPickupLocation}</p>
              )}
              {selectedReport.targetUserName && (
                <p style={{ margin: 0, fontWeight: 600, color: '#1a1a1a' }}>{selectedReport.targetUserName} ({selectedReport.targetUserEmail})</p>
              )}
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#bbb' }}>ID: {selectedReport.targetId}</p>
            </div>

            {/* Reasons */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reasons</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedReport.reasons?.map((reason: string) => (
                  <span key={reason} style={{ padding: '4px 12px', background: '#fff3e0', color: '#e65100', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {formatReason(reason)}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            {selectedReport.description && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</p>
                <p style={{ margin: 0, background: '#f9f9f9', padding: 12, borderRadius: 8, fontSize: 14, color: '#333', lineHeight: 1.6 }}>
                  {selectedReport.description}
                </p>
              </div>
            )}

            {/* Status / Action info */}
            {(selectedReport.status !== 'New' || selectedReport.action !== 'None') && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, background: '#f9f9f9', padding: 12, borderRadius: 8 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase' }}>Status</p>
                  <p style={{ margin: 0, fontWeight: 700, color: STATUS_COLORS[selectedReport.status] ?? '#333' }}>{STATUS_LABEL[selectedReport.status] ?? selectedReport.status}</p>
                </div>
                <div style={{ flex: 1, background: '#f9f9f9', padding: 12, borderRadius: 8 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase' }}>Action Taken</p>
                  <p style={{ margin: 0, fontWeight: 700, color: ACTION_COLORS[selectedReport.action] ?? '#333' }}>{selectedReport.action}</p>
                </div>
              </div>
            )}

            {selectedReport.adminNotes && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase' }}>Admin Notes</p>
                <p style={{ margin: 0, background: '#f9f9f9', padding: 12, borderRadius: 8, fontSize: 14, color: '#333' }}>{selectedReport.adminNotes}</p>
              </div>
            )}

            {/* Admin Action Form */}
            {selectedReport.status !== 'Resolved' && selectedReport.status !== 'Dismissed' && (
              <div style={{ borderTop: '1px solid #eee', paddingTop: 16 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase' }}>Take Action</p>
                <select value={selectedAction} onChange={e => setSelectedAction(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, marginBottom: 12 }}>
                  {api.reportActions.map(a => (
                    <option key={a.key} value={a.key}>{a.label}</option>
                  ))}
                </select>
                <textarea value={actionNote} onChange={e => setActionNote(e.target.value)}
                  placeholder="Internal notes (optional — visible to other admins)"
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAction} disabled={actionLoading}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: 'none', background: '#e53935', color: '#fff', fontWeight: 700, cursor: actionLoading ? 'default' : 'pointer', fontSize: 14, opacity: actionLoading ? 0.6 : 1 }}>
                    {actionLoading ? 'Applying...' : 'Apply Action'}
                  </button>
                  <button onClick={() => { setSelectedReport(null); setSelectedAction('None'); setActionNote(''); }}
                    style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', cursor: 'pointer', fontSize: 14 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
