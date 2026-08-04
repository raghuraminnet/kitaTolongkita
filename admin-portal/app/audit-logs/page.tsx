'use client'
import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

type LogLevel = 'Debug' | 'Info' | 'Warning' | 'Error' | 'Critical'
type LogCategory = 'Auth' | 'Deal' | 'Order' | 'User' | 'System' | 'Payment' | 'Notification'

interface LogEntry {
  id: string
  userId: string | null
  userEmail: string | null
  category: string
  level: string
  action: string
  entityType: string | null
  entityId: string | null
  message: string
  metadata: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface LogStats {
  total: number
  debug: number
  info: number
  warning: number
  error: number
  critical: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  Debug:    { bg: '#F3F4F6', text: '#6B7280', label: 'Debug' },
  Info:     { bg: '#EFF6FF', text: '#1D4ED8', label: 'Info' },
  Warning:  { bg: '#FFFBEB', text: '#D97706', label: 'Warning' },
  Error:    { bg: '#FEF2F2', text: '#DC2626', label: 'Error' },
  Critical: { bg: '#FEF2F2', text: '#991B1B', label: 'Critical' },
}

const CATEGORIES: LogCategory[] = ['Auth', 'Deal', 'Order', 'User', 'System', 'Payment', 'Notification']
const LEVELS: LogLevel[] = ['Debug', 'Info', 'Warning', 'Error', 'Critical']

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

function parseMetadata(meta: string | null): Record<string, any> | null {
  if (!meta) return null
  try { return JSON.parse(meta) } catch { return null }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  const cfg = LEVEL_COLORS[level] ?? LEVEL_COLORS['Info']
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.3,
      backgroundColor: cfg.bg,
      color: cfg.text,
    }}>
      {cfg.label.toUpperCase()}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
      backgroundColor: '#F3F4F6',
      color: '#374151',
    }}>
      {category}
    </span>
  )
}

function StatsBar({ stats, onFilter }: {
  stats: LogStats | null
  onFilter: (level: string) => void
}) {
  if (!stats) return null
  const items = [
    { key: 'Info',     count: stats.info,     color: '#1D4ED8', bg: '#EFF6FF' },
    { key: 'Warning',  count: stats.warning,  color: '#D97706', bg: '#FFFBEB' },
    { key: 'Error',    count: stats.error,    color: '#DC2626', bg: '#FEF2F2' },
    { key: 'Critical', count: stats.critical, color: '#991B1B', bg: '#FEF2F2' },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, alignSelf: 'center' }}>
        Total: {stats.total}
      </span>
      <div style={{ width: 1, height: 20, background: '#E5E7EB', alignSelf: 'center' }} />
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => onFilter(item.key)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 10px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            border: '1px solid transparent',
            cursor: 'pointer',
            backgroundColor: item.bg,
            color: item.color,
            transition: 'all 0.15s',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }} />
          {item.key}: {item.count}
        </button>
      ))}
    </div>
  )
}

function MetadataTooltip({ meta }: { meta: string | null }) {
  const parsed = parseMetadata(meta)
  if (!parsed) return null
  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: '100%',
      zIndex: 50,
      backgroundColor: '#1F2937',
      color: '#F9FAFB',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      minWidth: 220,
      maxWidth: 360,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      whiteSpace: 'pre-wrap' as const,
      fontFamily: 'monospace',
    }}>
      {JSON.stringify(parsed, null, 2)}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<LogStats | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pageSize] = useState(30)

  // Filters
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [actionSearch, setActionSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const totalPages = Math.ceil(total / pageSize)

  const loadStats = useCallback(async () => {
    try {
      const res: any = await api.auditLogsStats()
      if (res) setStats(res)
    } catch { /* ignore */ }
  }, [])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, pageSize }
      if (levelFilter) params.level = levelFilter
      if (categoryFilter) params.category = categoryFilter
      if (actionSearch) params.action = actionSearch
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo
      const res: any = await api.auditLogs(params)
      if (res?.items) {
        setLogs(res.items)
        setTotal(res.totalCount ?? 0)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, levelFilter, categoryFilter, actionSearch, dateFrom, dateTo])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadStats()
  }, [router, loadStats])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) return
    loadLogs()
  }, [loadLogs])

  const handleLevelFilter = (level: string) => {
    setLevelFilter(prev => prev === level ? '' : level)
    setPage(1)
  }

  const handleClearFilters = () => {
    setLevelFilter('')
    setCategoryFilter('')
    setActionSearch('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const handleExport = async () => {
    const params: any = { pageSize: 10000 }
    if (levelFilter) params.level = levelFilter
    if (categoryFilter) params.category = categoryFilter
    if (actionSearch) params.action = actionSearch
    if (dateFrom) params.from = dateFrom
    if (dateTo) params.to = dateTo

    const token = localStorage.getItem('admin_token')
    if (!token) return

    const qs = new URLSearchParams(params as any).toString()
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'
    const res = await fetch(`${API_BASE}/audit-logs/export?${qs}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activeFilters = [levelFilter, categoryFilter, actionSearch, dateFrom, dateTo].filter(Boolean).length

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        {/* ── Top bar ── */}
        <div className="topbar">
          <div>
            <div className="page-title">Audit Logs</div>
            <div style={{ fontSize: 13, color: 'var(--muted, #6B7280)', marginTop: 2 }}>
              {total.toLocaleString()} entries
            </div>
          </div>
          <button
            onClick={handleExport}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid #E5E7EB',
              backgroundColor: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', color: '#374151',
            }}
          >
            📥 Export CSV
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div className="page-content">

          {/* Stats summary */}
          {stats && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
              border: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <StatsBar stats={stats} onFilter={handleLevelFilter} />
            </div>
          )}

          {/* Active filter chips */}
          {activeFilters > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>Filters:</span>
              {levelFilter && (
                <button onClick={() => { setLevelFilter(''); setPage(1) }} style={filterChipStyle}>
                  Level: {levelFilter} ✕
                </button>
              )}
              {categoryFilter && (
                <button onClick={() => { setCategoryFilter(''); setPage(1) }} style={filterChipStyle}>
                  Category: {categoryFilter} ✕
                </button>
              )}
              {actionSearch && (
                <button onClick={() => { setActionSearch(''); setPage(1) }} style={filterChipStyle}>
                  Action: {actionSearch} ✕
                </button>
              )}
              {dateFrom && (
                <button onClick={() => { setDateFrom(''); setPage(1) }} style={filterChipStyle}>
                  From: {dateFrom} ✕
                </button>
              )}
              {dateTo && (
                <button onClick={() => { setDateTo(''); setPage(1) }} style={filterChipStyle}>
                  To: {dateTo} ✕
                </button>
              )}
              <button onClick={handleClearFilters} style={{ ...filterChipStyle, color: '#DC2626', borderColor: '#FCA5A5' }}>
                Clear all
              </button>
            </div>
          )}

          {/* Filter row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {/* Level */}
            <select
              value={levelFilter}
              onChange={e => { setLevelFilter(e.target.value); setPage(1) }}
              style={filterSelectStyle}
            >
              <option value="">All Levels</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
              style={filterSelectStyle}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Action search */}
            <input
              type="text"
              placeholder="Search action..."
              value={actionSearch}
              onChange={e => { setActionSearch(e.target.value); setPage(1) }}
              style={{ ...filterSelectStyle, flex: 1, minWidth: 160 }}
            />

            {/* Date range */}
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              style={filterSelectStyle}
              title="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              style={filterSelectStyle}
              title="To date"
            />

            {/* Refresh */}
            <button
              onClick={() => { loadLogs(); loadStats() }}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                backgroundColor: '#fff', cursor: 'pointer', fontSize: 13,
              }}
            >
              🔄
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <h3>No audit logs found</h3>
              <p style={{ color: '#6B7280', fontSize: 13 }}>
                {activeFilters > 0 ? 'Try adjusting your filters.' : 'Activity will appear here once API requests start flowing.'}
              </p>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="table-wrap" style={{ overflowX: 'auto' }}>
                  <table style={{ minWidth: 900 }}>
                    <thead>
                      <tr>
                        <th>Time (MYT)</th>
                        <th>Level</th>
                        <th>Category</th>
                        <th>Action</th>
                        <th>User</th>
                        <th>Entity</th>
                        <th>Message</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id} style={{ fontSize: 13 }}>
                          <td style={{ whiteSpace: 'nowrap', color: '#6B7280' }}>
                            {formatDate(log.createdAt)}
                          </td>
                          <td><LevelBadge level={log.level} /></td>
                          <td><CategoryBadge category={log.category} /></td>
                          <td>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: 12,
                              color: '#374151',
                              backgroundColor: '#F9FAFB',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.userEmail
                              ? <span title={log.userEmail}>{log.userEmail}</span>
                              : <span style={{ color: '#9CA3AF' }}>—</span>
                            }
                          </td>
                          <td style={{ fontSize: 12, color: '#6B7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.entityType && log.entityId
                              ? `${log.entityType} #${log.entityId.slice(0, 8)}`
                              : <span style={{ color: '#D1D5DB' }}>—</span>
                            }
                          </td>
                          <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={log.message}>
                            {log.message}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#9CA3AF', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.ipAddress ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    style={paginationBtnStyle}
                  >‹ Prev</button>
                  <span style={{ fontSize: 13, color: '#6B7280', padding: '0 12px', alignSelf: 'center' }}>
                    Page {page} of {totalPages} · {total.toLocaleString()} entries
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    style={paginationBtnStyle}
                  >Next ›</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ── Shared styles ────────────────────────────────────────────────────────────

const filterSelectStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #E5E7EB',
  backgroundColor: '#fff',
  fontSize: 13,
  color: '#374151',
  cursor: 'pointer',
  minWidth: 130,
}

const filterChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  border: '1px solid #E5E7EB',
  backgroundColor: '#fff',
  color: '#374151',
  cursor: 'pointer',
}

const paginationBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 8,
  border: '1px solid #E5E7EB',
  backgroundColor: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  color: '#374151',
}
