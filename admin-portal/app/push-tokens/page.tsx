'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

const PLATFORM_ICONS: Record<string, string> = {
  android: '🤖',
  ios: '🍎',
  web: '🌐',
}

export default function PushTokensPage() {
  const router = useRouter()
  const [tokens, setTokens] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const pageSize = 50

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadTokens()
  }, [page, search])

  const loadTokens = () => {
    setLoading(true)
    api.pushTokens({ search: search || undefined, page, pageSize })
      .then((res: any) => {
        if (res.success && res.data) {
          setTokens(res.data.items || [])
          setTotal(res.data.totalCount || 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">📱 Push Tokens (FCM)</div>
          <div className="text-sm text-muted">{total} tokens registered</div>
        </div>
        <div className="page-content">
          <div className="search-bar mb-4">
            <input placeholder="Search by user email or name..." value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (setPage(1), loadTokens())} />
            <button className="btn btn-primary btn-sm" onClick={() => { setPage(1); loadTokens() }}>Search</button>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : tokens.length === 0 ? (
            <div className="empty-state"><div className="icon">📱</div><h3>No push tokens found</h3></div>
          ) : (
            <>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Platform</th>
                        <th>User</th>
                        <th>Token (masked)</th>
                        <th>Active</th>
                        <th>Last Used</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map(t => (
                        <tr key={t.id}>
                          <td>
                            <span style={{ fontSize: 20 }}>
                              {PLATFORM_ICONS[t.platform?.toLowerCase()] || '📱'}
                            </span>
                            <span className="text-sm text-muted ml-1">{t.platform}</span>
                          </td>
                          <td>
                            <div className="font-bold">{t.userName || '-'}</div>
                            <div className="text-sm text-muted">{t.userEmail}</div>
                          </td>
                          <td>
                            <code className="text-sm" style={{ fontSize: 10, wordBreak: 'break-all' }}>
                              {t.tokenMasked}
                            </code>
                          </td>
                          <td>
                            <span className={`badge ${t.isActive ? 'badge-active' : 'badge-inactive'}`}>
                              {t.isActive ? '✅ Active' : '❌ Inactive'}
                            </span>
                          </td>
                          <td className="text-sm text-muted">
                            {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : 'Never'}
                          </td>
                          <td className="text-sm text-muted">
                            {new Date(t.createdAt).toLocaleDateString()}
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
        </div>
      </main>
    </div>
  )
}
