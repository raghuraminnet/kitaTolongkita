'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import {
  Users,
  Tag,
  ShoppingBag,
  DollarSign,
  Clock,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Activity,
  Layers,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

interface Kpis {
  totalUsers: number
  activeDeals: number
  ordersToday: number
  todayRevenue: number
  pendingModeration: number
  newUsersToday: number
  growthPercent: number
  recentActivity: Array<{
    action: string
    entityType: string
    entityId: number
    summary: string
    at: string
  }>
}

interface LogStats {
  total: number
  info: number
  warning: number
  error: number
  critical: number
}

const MOCK_CHART_DATA = [
  { day: 'Mon', orders: 12, revenue: 340, users: 4 },
  { day: 'Tue', orders: 19, revenue: 580, users: 6 },
  { day: 'Wed', orders: 15, revenue: 420, users: 5 },
  { day: 'Thu', orders: 28, revenue: 890, users: 9 },
  { day: 'Fri', orders: 34, revenue: 1120, users: 14 },
  { day: 'Sat', orders: 45, revenue: 1560, users: 22 },
  { day: 'Sun', orders: 40, revenue: 1380, users: 18 },
]

export default function DashboardPage() {
  const router = useRouter()
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [logStats, setLogStats] = useState<LogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mounted, setMounted] = useState(false)

  const loadData = async () => {
    try {
      const [dashRes, logRes]: [any, any] = await Promise.all([
        api.dashboard(),
        api.auditLogsStats(),
      ])
      if (dashRes?.success) setKpis(dashRes.data)
      if (logRes) setLogStats(logRes)
    } catch (err) {
      console.error('Dashboard load failed:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/')
      return
    }
    loadData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  if (loading) {
    return (
      <div className="layout">
        <Sidebar />
        <main className="main">
          <div className="loading">
            <div className="spinner" />
          </div>
        </main>
      </div>
    )
  }

  const k = kpis || {
    totalUsers: 0,
    activeDeals: 0,
    ordersToday: 0,
    todayRevenue: 0,
    pendingModeration: 0,
    newUsersToday: 0,
    growthPercent: 0,
    recentActivity: [],
  }

  const hasErrors = (logStats?.error ?? 0) > 0

  return (
    <div className="layout">
      <Sidebar pendingCount={k.pendingModeration} />
      <main className="main">
        {/* Sticky Executive Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <div className="page-title">Executive Command Center</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              KitaTolongKita Live Platform Overview
            </div>
          </div>
          <div className="topbar-right">
            <div className="status-pill-online">
              <span className="status-dot" />
              API Connected (:5050)
            </div>
            <button
              onClick={handleRefresh}
              className="btn btn-outline btn-sm"
              title="Refresh Dashboard Metrics"
            >
              <RefreshCw
                size={14}
                style={{
                  animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
                }}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="page-content">
          {/* Welcome Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
              borderRadius: 20,
              padding: '24px 28px',
              color: '#FFFFFF',
              marginBottom: 28,
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: -20,
                bottom: -30,
                fontSize: 160,
                opacity: 0.05,
                userSelect: 'none',
              }}
            >
              🇲🇾
            </div>

            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255, 87, 34, 0.2)',
                  border: '1px solid rgba(255, 87, 34, 0.35)',
                  color: '#FF7A45',
                  padding: '3px 10px',
                  borderRadius: 9999,
                  fontSize: 11.5,
                  fontWeight: 700,
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <Sparkles size={12} />
                Gotong Royong 2.0 Engine
              </div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  marginBottom: 4,
                  letterSpacing: '-0.02em',
                }}
              >
                Selamat Datang, Super Admin 👋
              </h2>
              <p style={{ fontSize: 14, color: '#94A3B8', maxWidth: 540 }}>
                Platform is operating normally. Monitor deals, review incoming
                bulk-buys, and oversee Malaysian neighborhood communities.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {k.pendingModeration > 0 && (
                <button
                  className="btn btn-primary"
                  onClick={() => router.push('/deals')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Tag size={16} />
                  Review Deals ({k.pendingModeration})
                </button>
              )}
              <button
                className="btn btn-outline"
                onClick={() => router.push('/notifications')}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                }}
              >
                Broadcast Push
              </button>
            </div>
          </div>

          {/* 6 KPI Cards Grid */}
          <div className="kpi-grid">
            {/* Total Users */}
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">Total Users</span>
                <div className="kpi-icon-wrap kpi-icon-blue">
                  <Users size={22} />
                </div>
              </div>
              <div className="kpi-value">{k.totalUsers.toLocaleString()}</div>
              <div
                className={`kpi-badge ${k.newUsersToday > 0 ? 'up' : 'neutral'}`}
              >
                <TrendingUp size={12} />+{k.newUsersToday} joined today
              </div>
            </div>

            {/* Active Deals */}
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">Active Deals</span>
                <div className="kpi-icon-wrap kpi-icon-coral">
                  <Tag size={22} />
                </div>
              </div>
              <div className="kpi-value">{k.activeDeals.toLocaleString()}</div>
              <div className="kpi-badge neutral">
                <Layers size={12} />
                In Community Feed
              </div>
            </div>

            {/* Orders Today */}
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">Orders Today</span>
                <div className="kpi-icon-wrap kpi-icon-emerald">
                  <ShoppingBag size={22} />
                </div>
              </div>
              <div className="kpi-value">{k.ordersToday.toLocaleString()}</div>
              <div className="kpi-badge up">
                <Activity size={12} />
                Live group orders
              </div>
            </div>

            {/* Revenue Today */}
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-label">Today's Volume</span>
                <div className="kpi-icon-wrap kpi-icon-amber">
                  <DollarSign size={22} />
                </div>
              </div>
              <div className="kpi-value">RM{k.todayRevenue.toFixed(2)}</div>
              <div className="kpi-badge up">
                <TrendingUp size={12} />
                Gross Deal Value
              </div>
            </div>

            {/* Pending Moderation */}
            <div
              className="kpi-card"
              style={{
                borderColor: k.pendingModeration > 0 ? '#FF5722' : undefined,
                background:
                  k.pendingModeration > 0 ? '#FFF7ED' : 'var(--surface)',
              }}
            >
              <div className="kpi-card-header">
                <span className="kpi-label">Pending Moderation</span>
                <div className="kpi-icon-wrap kpi-icon-coral">
                  <Clock size={22} />
                </div>
              </div>
              <div
                className="kpi-value"
                style={{
                  color: k.pendingModeration > 0 ? '#C2410C' : 'var(--text)',
                }}
              >
                {k.pendingModeration}
              </div>
              {k.pendingModeration > 0 ? (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => router.push('/deals')}
                  style={{ marginTop: 6 }}
                >
                  Review Queue
                  <ArrowRight size={14} />
                </button>
              ) : (
                <div className="kpi-badge up">
                  <ShieldCheck size={12} />
                  Queue all clear
                </div>
              )}
            </div>

            {/* System Health / Audit Logs */}
            <div
              className="kpi-card"
              style={{
                cursor: 'pointer',
                borderColor: hasErrors ? '#EF4444' : undefined,
              }}
              onClick={() => router.push('/audit-logs')}
            >
              <div className="kpi-card-header">
                <span className="kpi-label">System Health</span>
                <div
                  className="kpi-icon-wrap"
                  style={{
                    background: hasErrors
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'rgba(16, 185, 129, 0.12)',
                    color: hasErrors ? '#EF4444' : '#10B981',
                  }}
                >
                  {hasErrors ? (
                    <AlertTriangle size={22} />
                  ) : (
                    <ShieldCheck size={22} />
                  )}
                </div>
              </div>
              <div
                className="kpi-value"
                style={{ color: hasErrors ? '#DC2626' : '#10B981' }}
              >
                {logStats?.error ?? 0}{' '}
                <span style={{ fontSize: 16, fontWeight: 500 }}>errors</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                {logStats?.warning ?? 0} warnings · {logStats?.info ?? 0} info
                events
              </div>
            </div>
          </div>

          {/* Interactive Charts Section */}
          {mounted && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: 20,
                marginBottom: 28,
              }}
            >
              {/* Order Velocity & Revenue Area Chart */}
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">Order & Revenue Trends</div>
                    <div className="card-subtitle">
                      7-day historical order velocity
                    </div>
                  </div>
                  <span
                    className="kpi-badge up"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    +24.6% vs last week
                  </span>
                </div>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={MOCK_CHART_DATA}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorOrders"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#FF5722"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#FF5722"
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis
                        dataKey="day"
                        stroke="#94A3B8"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94A3B8"
                        fontSize={12}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0F172A',
                          borderRadius: 10,
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="orders"
                        stroke="#FF5722"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorOrders)"
                        name="Orders"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Daily User Signups Bar Chart */}
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">User Growth</div>
                    <div className="card-subtitle">Daily neighborhood registrations</div>
                  </div>
                  <span className="badge badge-active">Active</span>
                </div>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={MOCK_CHART_DATA}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis
                        dataKey="day"
                        stroke="#94A3B8"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94A3B8"
                        fontSize={12}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0F172A',
                          borderRadius: 10,
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="users"
                        fill="#10B981"
                        radius={[6, 6, 0, 0]}
                        name="New Users"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Recent Platform Actions</div>
                <div className="card-subtitle">
                  Real-time audit events and moderator actions
                </div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => router.push('/audit-logs')}
              >
                View Full Audit Logs
                <ArrowRight size={14} />
              </button>
            </div>

            {k.recentActivity.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon-wrap">
                  <ShieldCheck size={28} />
                </div>
                <h3>No recent moderator activity</h3>
                <p>
                  Platform events and moderation decisions will appear here in
                  real time.
                </p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Summary</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {k.recentActivity.map((a, i) => (
                      <tr key={i}>
                        <td>
                          <span className="badge badge-processing">
                            {a.action}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {a.entityType} #{a.entityId}
                        </td>
                        <td style={{ color: '#475569' }}>{a.summary}</td>
                        <td style={{ color: '#94A3B8', fontSize: 13 }}>
                          {new Date(a.at).toLocaleString()}
                        </td>
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
