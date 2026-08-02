'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface SavedList {
  id: string
  userId: string
  userEmail: string
  userName: string
  name: string
  isPublic: boolean
  dealCount: number
  createdAt: string
}

interface SavedListDetail {
  id: string
  userId: string
  userEmail: string
  userName: string
  name: string
  isPublic: boolean
  createdAt: string
  deals: SavedDeal[]
}

interface SavedDeal {
  id: string
  dealId: string
  dealTitle: string
  dealCategory: string
  dealPrice: number
  dealStatus: string
  savedAt: string
}

export default function SavedListsPage() {
  const router = useRouter()
  const [lists, setLists] = useState<SavedList[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedList, setSelectedList] = useState<SavedListDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const pageSize = 20

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadLists()
  }, [page, search])

  const loadLists = () => {
    setLoading(true)
    api.savedLists({ search: search || undefined, page, pageSize })
      .then((res: any) => {
        if (res.success && res.data) {
          setLists(res.data.items || [])
          setTotal(res.data.totalCount || 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const openDetail = (id: string) => {
    setDetailLoading(true)
    setSelectedList(null)
    api.savedListDetail(id)
      .then((res: any) => {
        if (res.success) setSelectedList(res.data)
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">Saved Lists</div>
          <div className="text-sm text-muted">{total} lists saved by users</div>
        </div>
        <div className="page-content">
          <div className="search-bar mb-4">
            <input placeholder="Search by list name, user email or name..." value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (setPage(1), loadLists())} />
            <button className="btn btn-primary btn-sm" onClick={() => { setPage(1); loadLists() }}>Search</button>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : lists.length === 0 ? (
            <div className="empty-state"><div className="icon">🔖</div><h3>No saved lists found</h3></div>
          ) : (
            <>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>List Name</th>
                        <th>Owner</th>
                        <th>Visibility</th>
                        <th>Deals Saved</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lists.map(list => (
                        <tr key={list.id}>
                          <td className="font-bold">{list.name}</td>
                          <td>
                            <div>{list.userName || '-'}</div>
                            <div className="text-sm text-muted">{list.userEmail}</div>
                          </td>
                          <td>
                            <span className={`badge ${list.isPublic ? 'badge-active' : 'badge-inactive'}`}>
                              {list.isPublic ? '🌐 Public' : '🔒 Private'}
                            </span>
                          </td>
                          <td>{list.dealCount}</td>
                          <td className="text-sm text-muted">{new Date(list.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button className="btn btn-sm btn-outline" onClick={() => openDetail(list.id)}>
                              View Deals
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

      {selectedList && (
        <div className="modal-overlay" onClick={() => setSelectedList(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div className="modal-title">🔖 {selectedList.name}</div>
              <button className="modal-close" onClick={() => setSelectedList(null)}>×</button>
            </div>
            <div className="mb-4">
              <div className="text-sm text-muted mb-2">
                Created by <strong>{selectedList.userName}</strong> ({selectedList.userEmail}) on {new Date(selectedList.createdAt).toLocaleDateString()}
              </div>
              <span className={`badge ${selectedList.isPublic ? 'badge-active' : 'badge-inactive'}`}>
                {selectedList.isPublic ? '🌐 Public' : '🔒 Private'}
              </span>
            </div>
            {selectedList.deals.length === 0 ? (
              <div className="empty-state"><div className="icon">📭</div><h3>No deals in this list</h3></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Deal Title</th><th>Category</th><th>Price</th><th>Status</th><th>Saved On</th></tr>
                  </thead>
                  <tbody>
                    {selectedList.deals.map(d => (
                      <tr key={d.id}>
                        <td className="font-bold">{d.dealTitle}</td>
                        <td>{d.dealCategory}</td>
                        <td className="text-success">RM{d.dealPrice.toFixed(2)}</td>
                        <td><span className={`badge ${d.dealStatus === 'Approved' ? 'badge-approved' : 'badge-pending'}`}>{d.dealStatus}</span></td>
                        <td className="text-sm text-muted">{new Date(d.savedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {detailLoading && (
        <div className="modal-overlay">
          <div className="modal"><div className="loading"><div className="spinner" /></div></div>
        </div>
      )}
    </div>
  )
}
