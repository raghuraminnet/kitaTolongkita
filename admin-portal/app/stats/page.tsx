'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface DealStats {
  totalDeals: number
  approvedDeals: number
  rejectedDeals: number
  pendingDeals: number
  featuredDeals: number
  totalOrders: number
  totalRevenue: number
  topCategories: { category: string; count: number; totalOrders: number; totalRevenue: number }[]
  dealsOverTime: { date: string; count: number }[]
}

export default function StatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DealStats | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadStats()
  }, [days])

  const loadStats = () => {
    setLoading(true)
    api.dealStats(days)
      .then((res: any) => { if (res.success) setStats(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const s = stats
  const maxDailyCount = s ? Math.max(...s.dealsOverTime.map(d => d.count), 1) : 1

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">📈 Deal Statistics</div>
          <div className="flex gap-2">
            {[7, 14, 30, 60, 90].map(d => (
              <button key={d}
                className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setDays(d)}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="page-content">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : !s ? (
            <div className="empty-state"><div className="icon">📊</div><h3>No data available</h3></div>
          ) : (
            <>
              {/* KPI Row */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon">🏷️</div>
                  <div className="kpi-value">{s.totalDeals}</div>
                  <div className="kpi-label">Total Deals</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">✅</div>
                  <div className="kpi-value">{s.approvedDeals}</div>
                  <div className="kpi-label">Approved</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">❌</div>
                  <div className="kpi-value">{s.rejectedDeals}</div>
                  <div className="kpi-label">Rejected</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">⏳</div>
                  <div className="kpi-value">{s.pendingDeals}</div>
                  <div className="kpi-label">Pending</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">⭐</div>
                  <div className="kpi-value">{s.featuredDeals}</div>
                  <div className="kpi-label">Featured</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">📦</div>
                  <div className="kpi-value">{s.totalOrders}</div>
                  <div className="kpi-label">Total Orders</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon">💰</div>
                  <div className="kpi-value">RM{s.totalRevenue.toFixed(2)}</div>
                  <div className="kpi-label">Total Revenue</div>
                </div>
              </div>

              {/* Daily bar chart */}
              <div className="card mb-4">
                <div className="card-header">
                  <div className="card-title">Deals Posted Over Time ({days} days)</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, padding: '8px 0' }}>
                  {s.dealsOverTime.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        height: Math.max(4, (d.count / maxDailyCount) * 100),
                        background: d.count > 0 ? '#0e6a5b' : '#e0e0e0',
                        borderRadius: 3,
                        width: '100%',
                        minWidth: 4,
                        transition: 'height 0.3s ease',
                      }} title={`${d.date}: ${d.count} deals`} />
                      {i % Math.ceil(s.dealsOverTime.length / 7) === 0 && (
                        <div className="text-sm text-muted" style={{ fontSize: 9 }}>{d.date.slice(5)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Category breakdown */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Top Categories</div>
                </div>
                {s.topCategories.length === 0 ? (
                  <div className="empty-state"><div className="icon">🏷️</div><h3>No category data</h3></div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>#</th><th>Category</th><th>Deals</th><th>Orders</th><th>Revenue</th><th>Avg Price</th></tr>
                      </thead>
                      <tbody>
                        {s.topCategories.map((cat, i) => (
                          <tr key={cat.category}>
                            <td>{i + 1}</td>
                            <td className="font-bold">{cat.category}</td>
                            <td>{cat.count}</td>
                            <td>{cat.totalOrders}</td>
                            <td className="text-success">RM{cat.totalRevenue.toFixed(2)}</td>
                            <td className="text-muted">
                              {cat.totalOrders > 0 ? `RM${(cat.totalRevenue / cat.totalOrders).toFixed(2)}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Approval rate */}
              {s.totalDeals > 0 && (
                <div className="card mt-4">
                  <div className="card-header">
                    <div className="card-title">Moderation Overview</div>
                  </div>
                  <div style={{ display: 'flex', height: 24, borderRadius: 12, overflow: 'hidden', margin: '12px 0' }}>
                    <div style={{ flex: s.approvedDeals, background: '#4caf50' }} title={`Approved: ${s.approvedDeals}`} />
                    <div style={{ flex: s.rejectedDeals, background: '#e53935' }} title={`Rejected: ${s.rejectedDeals}`} />
                    <div style={{ flex: s.pendingDeals, background: '#ff9800' }} title={`Pending: ${s.pendingDeals}`} />
                  </div>
                  <div className="flex gap-4" style={{ justifyContent: 'center' }}>
                    <div className="text-sm"><span style={{ color: '#4caf50' }}>●</span> Approved {s.approvedDeals} ({s.totalDeals > 0 ? ((s.approvedDeals / s.totalDeals) * 100).toFixed(1) : 0}%)</div>
                    <div className="text-sm"><span style={{ color: '#e53935' }}>●</span> Rejected {s.rejectedDeals} ({s.totalDeals > 0 ? ((s.rejectedDeals / s.totalDeals) * 100).toFixed(1) : 0}%)</div>
                    <div className="text-sm"><span style={{ color: '#ff9800' }}>●</span> Pending {s.pendingDeals} ({s.totalDeals > 0 ? ((s.pendingDeals / s.totalDeals) * 100).toFixed(1) : 0}%)</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
