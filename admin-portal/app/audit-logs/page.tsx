'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function AuditLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const pageSize = 50

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/') }
    else loadLogs()
  }, [page])

  const loadLogs = () => {
    setLoading(true)
    api.auditLogs({ page, pageSize })
      .then((res: any) => { if (res.items) { setLogs(res.items); setTotal(res.totalCount) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">Audit Logs</div>
          <div className="text-sm text-muted">{total} entries</div>
        </div>
        <div className="page-content">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state"><div className="icon">📋</div><h3>No audit logs yet</h3></div>
          ) : (
            <>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th><th>Admin</th><th>Action</th><th>Entity</th><th>ID</th><th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, i) => (
                        <tr key={i}>
                          <td className="text-sm text-muted">{new Date(log.at).toLocaleString()}</td>
                          <td className="font-bold">{log.adminEmail}</td>
                          <td><span className="badge badge-processing">{log.action}</span></td>
                          <td>{log.entityType}</td>
                          <td>#{log.entityId}</td>
                          <td className="text-sm text-muted">{log.details || '-'}</td>
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
