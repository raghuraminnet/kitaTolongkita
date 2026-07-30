'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const pageSize = 20

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadUsers()
  }, [page, search, filter])

  const loadUsers = () => {
    setLoading(true)
    api.users({ search: search || undefined, filter: filter || undefined, page, pageSize })
      .then((res: any) => { if (res.items) { setUsers(res.items); setTotal(res.totalCount) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const toggleStatus = async (id: number, currentActive: boolean) => {
    try {
      await api.toggleUserStatus(id, !currentActive)
      setUsers(u => u.map(x => x.id === id ? { ...x, emailVerified: !currentActive } : x))
    } catch { alert('Failed to update') }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">User Management</div>
          <div className="text-sm text-muted">{total} total users</div>
        </div>
        <div className="page-content">
          <div className="search-bar">
            <input placeholder="Search by email or name..." value={search}
              onChange={e => setSearch(e.target.value)} />
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All Users</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state"><div className="icon">👥</div><h3>No users found</h3></div>
          ) : (
            <>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th><th>Name</th><th>Email</th><th>Verified</th><th>Deals Posted</th><th>Joined</th><th>Joined On</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>#{u.id}</td>
                          <td className="font-bold">{u.fullName}</td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`badge ${u.emailVerified ? 'badge-active' : 'badge-inactive'}`}>
                              {u.emailVerified ? '✓ Verified' : 'Unverified'}
                            </span>
                          </td>
                          <td>{u.dealsPosted ?? '-'}</td>
                          <td>{u.dealsJoined ?? '-'}</td>
                          <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="flex gap-2">
                              <button className="btn btn-sm btn-outline"
                                onClick={() => router.push(`/users/${u.id}`)}>View</button>
                              <button
                                className={`btn btn-sm ${u.emailVerified ? 'btn-danger' : 'btn-success'}`}
                                onClick={() => toggleStatus(u.id, u.emailVerified)}>
                                {u.emailVerified ? 'Disable' : 'Enable'}
                              </button>
                            </div>
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
