'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface Kpis {
  totalUsers: number
  activeDeals: number
  ordersToday: number
  todayRevenue: number
  pendingModeration: number
  newUsersToday: number
  growthPercent: number
  recentActivity: Array<{ action: string; entityType: string; entityId: number; summary: string; at: string }>
}

interface LogStats {
  total: number
  info: number
  warning: number
  error: number
  critical: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [logStats, setLogStats] = useState<LogStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }

    Promise.all([
      api.dashboard(),
      api.auditLogsStats(),
    ])
      .then(([dashRes, logRes]: [any, any]) => {
        if (dashRes?.success) setKpis(dashRes.data)
        if (logRes) setLogStats(logRes)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="layout">
      <Sidebar />
      <main className="main"><div className="page-content"><div className="loading"><div className="spinner" /></div></div></main>
    </div>
  )

  const k = kpis || { totalUsers: 0, activeDeals: 0, ordersToday: 0, todayRevenue: 0, pendingModeration: 0, newUsersToday: 0, growthPercent: 0, recentActivity: [] }

  return (
    <div className="layout">
      <Sidebar pendingCount={k.pendingModeration} />
      <main className="main">
        <div className="topbar">
          <div className="page-title">Dashboard</div>
          <div className="text-sm text-muted">Overview & Key Metrics</div>
        </div>
        <div className="page-content">
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon">👥</div>
              <div className="kpi-value">{k.totalUsers.toLocaleString()}</div>
              <div className="kpi-label">Total Users</div>
              <div className={`kpi-change ${k.newUsersToday > 0 ? 'up' : 'down'}`}>
                +{k.newUsersToday} today
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon">🏷️</div>
              <div className="kpi-value">{k.activeDeals.toLocaleString()}</div>
              <div className="kpi-label">Active Deals</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon">📦</div>
              <div className="kpi-value">{k.ordersToday.toLocaleString()}</div>
              <div className="kpi-label">Orders Today</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon">💰</div>
              <div className="kpi-value">RM{k.todayRevenue.toFixed(2)}</div>
              <div className="kpi-label">Revenue Today</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon">⏳</div>
              <div className="kpi-value">{k.pendingModeration}</div>
              <div className="kpi-label">Pending Moderation</div>
              {k.pendingModeration > 0 && (
                <button className="btn btn-sm btn-primary mt-2" onClick={() => router.push('/deals')}>
                  Review Now
                </button>
              )}
            </div>
            <div className="kpi-card">
              <div className="kpi-icon">📈</div>
              <div className="kpi-value">{k.growthPercent > 0 ? `+${k.growthPercent}%` : k.growthPercent + '%'}</div>
              <div className="kpi-label">User Growth (7d)</div>
            </div>
            {/* System Health — from audit logs */}
            <div
              className="kpi-card"
              style={{
                borderLeft: (logStats?.error ?? 0) > 0 ? '3px solid #DC2626' : (logStats?.warning ?? 0) > 0 ? '3px solid #D97706' : '3px solid #10B981',
                cursor: 'pointer',
              }}
              onClick={() => router.push('/audit-logs')}
            >
              <div className="kpi-icon">🛡️</div>
              <div className="kpi-value" style={{ color: (logStats?.error ?? 0) > 0 ? '#DC2626' : '#374151' }}>
                {logStats?.error ?? 0}
              </div>
              <div className="kpi-label">Errors (today)</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {logStats?.warning ?? 0} warnings · {logStats?.info ?? 0} info
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Admin Actions</div>
            </div>
            {k.recentActivity.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📋</div>
                <h3>No activity yet</h3>
                <p>Moderation actions will appear here</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Summary</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {k.recentActivity.map((a, i) => (
                      <tr key={i}>
                        <td><span className="badge badge-processing">{a.action}</span></td>
                        <td>{a.entityType} #{a.entityId}</td>
                        <td className="text-sm text-muted">{a.summary}</td>
                        <td className="text-sm text-muted">{new Date(a.at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
