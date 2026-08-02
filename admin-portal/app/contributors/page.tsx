'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function ContributorsPage() {
  const router = useRouter()
  const [contributors, setContributors] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadContributors()
  }, [page])

  const loadContributors = () => {
    setLoading(true)
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    // The backend has GET /api/admin/contributors
    fetch(`${process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:5001'}/api/admin/contributors?page=${page}&size=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then((res: any) => {
      setContributors(res.items || [])
      setTotal(res.totalCount || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  const handleRevoke = async (userId: string) => {
    if (!confirm('Revoke contributor status? This user will no longer be able to post group buy deals.')) return
    setRevoking(userId)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:5001'}/api/admin/contributors/${userId}/revoke`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
      })
      loadContributors()
    } catch {}
    finally { setRevoking(null) }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: '#f5f5f5' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>🏅 Contributors</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>Approved contributors who can post group buy deals</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Contributor', 'Email / Phone', 'Since', 'Rating', 'Joined App', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#444', fontSize: 12, borderBottom: '1px solid #eee' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</td></tr>
              ) : contributors.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#999' }}>No contributors yet</td></tr>
              ) : (
                contributors.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0e6a5b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                          {c.fullName?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{c.fullName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#333' }}>{c.email}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>{c.phone ?? '—'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#666', fontSize: 13 }}>
                      {c.contributorSince ? new Date(c.contributorSince).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                        ★ {typeof c.contributorRating === 'number' ? c.contributorRating.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#666', fontSize: 13 }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => handleRevoke(c.id)}
                        disabled={revoking === c.id}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e53935', background: 'transparent', cursor: revoking === c.id ? 'default' : 'pointer', color: '#e53935', fontSize: 12, fontWeight: 600, opacity: revoking === c.id ? 0.5 : 1 }}>
                        {revoking === c.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e0e0e0', background: page === 1 ? '#f5f5f5' : '#fff', cursor: page === 1 ? 'default' : 'pointer' }}>←</button>
              <span style={{ fontSize: 13, color: '#666' }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e0e0e0', background: page === totalPages ? '#f5f5f5' : '#fff', cursor: page === totalPages ? 'default' : 'pointer' }}>→</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
