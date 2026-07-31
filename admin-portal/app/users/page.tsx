'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadUsers()
  }, [search])

  const loadUsers = () => {
    setLoading(true)
    api.appUsers({ search: search || undefined })
      .then((res: any) => {
        setUsers(res.data || [])
        setTotal(res.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">App Users</div>
          <div className="text-sm text-muted">{total} registered users</div>
        </div>
        <div className="page-content">
          <div className="search-bar mb-4">
            <input placeholder="Search by email or name..." value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadUsers()} />
            <button className="btn btn-primary btn-sm" onClick={loadUsers}>Search</button>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state"><div className="icon">👥</div><h3>No users found</h3></div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Verified</th>
                      <th>Active</th>
                      <th>Joined</th>
                      <th>Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="font-bold">{u.fullName || '-'}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || '-'}</td>
                        <td>
                          <span className={`badge ${u.emailVerified ? 'badge-active' : 'badge-inactive'}`}>
                            {u.emailVerified ? '✓ Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.isActive ? 'badge-active' : 'badge-inactive'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="text-sm text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
