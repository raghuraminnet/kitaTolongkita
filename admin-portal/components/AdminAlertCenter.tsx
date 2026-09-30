'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck, ExternalLink, X, AlertTriangle, ShieldAlert, Award, ShoppingBag, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

export function AdminAlertCenter() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const previousUnreadRef = useRef<number>(0)

  // Web Audio synthesizer chime for alerts
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch {
      // Audio context may be blocked before first user interaction
    }
  }

  const fetchUnread = async () => {
    try {
      const res: any = await api.adminAlertsUnreadCount()
      const count = res?.unreadCount || 0
      if (count > previousUnreadRef.current && previousUnreadRef.current !== 0) {
        playAlertChime()
      }
      previousUnreadRef.current = count
      setUnreadCount(count)
    } catch {
      // ignore
    }
  }

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res: any = await api.adminAlerts({ pageSize: 15 })
      const data = res?.data || res
      setAlerts(data?.items || [])
      setUnreadCount(data?.unreadCount || 0)
      previousUnreadRef.current = data?.unreadCount || 0
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 12000) // check every 12s
    return () => clearInterval(interval)
  }, [])

  const handleToggle = () => {
    if (!isOpen) {
      fetchAlerts()
    }
    setIsOpen(!isOpen)
  }

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.markAdminAlertRead(id)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a))
      setUnreadCount(prev => Math.max(0, prev - 1))
      previousUnreadRef.current = Math.max(0, previousUnreadRef.current - 1)
    } catch {}
  }

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAdminAlertsRead()
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
      setUnreadCount(0)
      previousUnreadRef.current = 0
    } catch {}
  }

  const handleAlertClick = (alert: any) => {
    if (!alert.isRead) {
      api.markAdminAlertRead(alert.id).catch(() => {})
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, isRead: true } : a))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    setIsOpen(false)
    if (alert.actionUrl) {
      router.push(alert.actionUrl)
    } else if (alert.type === 'user_report') {
      router.push('/reports')
    } else if (alert.type === 'deal_flagged') {
      router.push('/deals')
    } else if (alert.type === 'contributor_application') {
      router.push('/contributors')
    } else if (alert.type === 'order_escalation') {
      router.push('/orders')
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'urgent':
        return <span className="badge badge-danger">🔴 Urgent</span>
      case 'high':
        return <span className="badge badge-warning">🟠 High</span>
      case 'medium':
        return <span className="badge badge-pending">🟡 Medium</span>
      default:
        return <span className="badge badge-info">🔵 Info</span>
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'user_report':
        return <AlertTriangle size={18} className="text-danger" />
      case 'deal_flagged':
        return <ShieldAlert size={18} className="text-warning" />
      case 'contributor_application':
        return <Award size={18} className="text-primary" />
      case 'order_escalation':
        return <ShoppingBag size={18} className="text-info" />
      default:
        return <Info size={18} />
    }
  }

  return (
    <div className="relative inline-block">
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        className="btn btn-outline btn-sm relative flex items-center gap-1.5"
        style={{ padding: '6px 12px', minWidth: '40px' }}
        title="Admin Notifications & Real-Time Alerts"
      >
        <Bell size={16} className={unreadCount > 0 ? 'text-warning animate-bounce' : ''} />
        {unreadCount > 0 && (
          <span
            style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '999px',
              padding: '1px 6px',
              marginLeft: '2px',
              boxShadow: '0 0 8px rgba(239,68,68,0.6)'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out Alert Drawer / Modal */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col shadow-2xl"
            style={{
              backgroundColor: '#121216',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-primary" />
                <h3 className="font-bold text-base text-white">Live Admin Alerts</h3>
                {unreadCount > 0 && (
                  <span className="badge badge-danger text-xs">{unreadCount} New</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="btn btn-sm btn-outline text-xs flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} />
                    Read all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="btn btn-sm btn-ghost p-1 text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Alert List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading && alerts.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  Checking alerts...
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 text-sm">
                  <div className="text-3xl mb-2">🎉</div>
                  <div>All caught up! No pending alerts.</div>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className="p-3.5 rounded-lg cursor-pointer transition-all hover:brightness-110"
                    style={{
                      backgroundColor: alert.isRead ? '#18181f' : '#22222c',
                      border: alert.isRead
                        ? '1px solid rgba(255,255,255,0.05)'
                        : '1px solid rgba(245, 158, 11, 0.35)',
                      boxShadow: alert.isRead ? 'none' : '0 2px 10px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {getIcon(alert.type)}
                        <span className="font-semibold text-sm text-white">
                          {alert.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getSeverityBadge(alert.severity)}
                        {!alert.isRead && (
                          <button
                            onClick={(e) => handleMarkRead(alert.id, e)}
                            className="text-zinc-400 hover:text-white ml-1"
                            title="Mark as read"
                          >
                            <CheckCheck size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 line-clamp-2 mb-2 leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-white/5">
                      <span>{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1 text-primary hover:underline">
                        Take Action <ExternalLink size={11} />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="p-3 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span>Live polling active (every 12s)</span>
              <button
                onClick={() => { setIsOpen(false); router.push('/notifications') }}
                className="text-primary hover:underline"
              >
                View Push History →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
