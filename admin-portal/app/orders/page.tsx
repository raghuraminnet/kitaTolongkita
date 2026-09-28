'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { Search, Package, PackageCheck } from 'lucide-react'

const STATUSES = ['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const pageSize = 20

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadOrders()
  }, [status, page, search])

  const loadOrders = () => {
    setLoading(true)
    api.orders({ status: status === 'All' ? undefined : (status || undefined), search: search || undefined, page, pageSize })
      .then((res: any) => { if (res.items) { setOrders(res.items); setTotal(res.totalCount) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id)
    try {
      await api.updateOrderStatus(id, newStatus)
      setOrders(o => o.map(x => x.id === id ? { ...x, status: newStatus } : x))
    } catch { alert('Failed to update') }
    finally { setUpdating(null) }
  }

  const StatusBadge = ({ s }: { s: string }) => {
    const map: Record<string, string> = {
      Pending: 'badge-pending', Confirmed: 'badge-approved', Shipped: 'badge-processing',
      Delivered: 'badge-delivered', Cancelled: 'badge-rejected',
    }
    return <span className={`badge ${map[s] || 'badge-pending'}`}>{s}</span>
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="page-title">Order Fulfillment</div>
            <div className="text-sm text-muted">{total} customer transactions</div>
          </div>
          <div className="flex gap-2">
            {STATUSES.map(s => {
              const active = (s === 'All' && !status) || status === s
              return (
                <button key={s} className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setStatus(s === 'All' ? '' : s); setPage(1) }}>{s}</button>
              )
            })}
          </div>
        </div>
        <div className="page-content">
          <div className="search-input-wrap mb-4" style={{ maxWidth: 460 }}>
            <Search size={16} />
            <input placeholder="Search by buyer email or deal title..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <div className="icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <Package size={42} color="var(--muted)" />
              </div>
              <h3>No orders found</h3>
              <p className="text-sm text-muted">No transactions matched your selected filters.</p>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th><th>Buyer</th><th>Deal</th><th>Amount</th><th>Qty</th><th>Status</th><th>Date</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td>#{o.id}</td>
                          <td>
                            <div className="font-bold">{o.buyerName}</div>
                            <div className="text-xs text-muted">{o.buyerEmail}</div>
                          </td>
                          <td>{o.dealTitle}</td>
                          <td className="font-bold">RM{Number(o.amount).toFixed(2)}</td>
                          <td>{o.quantity}</td>
                          <td><StatusBadge s={o.status} /></td>
                          <td className="text-sm text-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                          <td>
                            <select
                              className="form-group"
                              style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                              value={o.status}
                              disabled={updating === o.id}
                              onChange={e => updateStatus(o.id, e.target.value)}
                            >
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
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
                  <span className="text-sm text-muted" style={{ padding: '0 12px' }}>Page {page} of {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
