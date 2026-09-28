'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { Search, Star, Medal } from 'lucide-react'

export default function ContributorsPage() {
  const router = useRouter()
  const [contributors, setContributors] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadContributors()
  }, [page, search])

  const loadContributors = () => {
    setLoading(true)
    api.contributors({ page, size: pageSize })
      .then((res: any) => {
        setContributors(res.items || res.data || [])
        setTotal(res.totalCount || res.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleRevoke = async (userId: string, name: string) => {
    if (!confirm(`Revoke contributor status for ${name}? They will no longer be able to post group buy deals.`)) return
    setRevoking(userId)
    try {
      await api.revokeContributor(userId)
      loadContributors()
    } catch {}
    finally { setRevoking(null) }
  }

  // Filter locally if API doesn't support search
  const displayed = search
    ? contributors.filter(c =>
        c.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
      )
    : contributors

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="page-title">Contributors</div>
            <div className="text-sm text-muted">{total} approved contributors who can post group buy deals</div>
          </div>
        </div>
        <div className="page-content">
          {/* Search */}
          <div className="flex gap-2 mb-4" style={{ alignItems: 'center' }}>
            <div className="search-input-wrap flex-1" style={{ maxWidth: 420 }}>
              <Search size={16} />
              <input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={loadContributors}>Search</button>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : displayed.length === 0 ? (
            <div className="empty-state">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <Medal size={42} color="var(--text-muted)" />
              </div>
              <h3>No contributors found</h3>
              <p className="text-sm text-muted">
                {search ? 'No contributors match your search query.' : 'No approved contributors yet.'}
              </p>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Contributor</th>
                        <th>Email / Phone</th>
                        <th>Contributor Since</th>
                        <th>Rating</th>
                        <th>Joined App</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map((c: any) => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0
                              }}>
                                {c.fullName?.[0]?.toUpperCase()}
                              </div>
                              <span className="font-bold">{c.fullName}</span>
                            </div>
                          </td>
                          <td>
                            <div>{c.email}</div>
                            <div className="text-sm text-muted">{c.phone ?? '—'}</div>
                          </td>
                          <td className="text-sm text-muted">
                            {c.contributorSince
                              ? new Date(c.contributorSince).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Star size={13} color="#F59E0B" fill="#F59E0B" />
                              <span className="font-bold" style={{ color: '#D97706' }}>
                                {typeof c.contributorRating === 'number' ? c.contributorRating.toFixed(1) : '—'}
                              </span>
                            </span>
                          </td>
                          <td className="text-sm text-muted">
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleRevoke(c.id, c.fullName)}
                              disabled={revoking === c.id}
                            >
                              {revoking === c.id ? 'Revoking...' : 'Revoke'}
                            </button>
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
