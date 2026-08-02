'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface Category {
  id: number
  name: string
  description?: string
  dealCount: number
  isActive: boolean
  createdAt: string
}

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadCategories()
  }, [])

  const loadCategories = () => {
    setLoading(true)
    api.categories()
      .then((res: any) => { if (res.success) setCategories(res.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) return
    setCreateLoading(true)
    try {
      await api.createCategory({ name: createName.trim(), description: createDesc.trim() || undefined })
      setShowCreate(false)
      setCreateName('')
      setCreateDesc('')
      loadCategories()
    } catch (err: any) {
      alert(err.message)
    } finally { setCreateLoading(false) }
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditDesc(cat.description || '')
    setEditActive(cat.isActive)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId || !editName.trim()) return
    setEditLoading(true)
    try {
      await api.updateCategory(editingId, { name: editName.trim(), description: editDesc.trim() || undefined, isActive: editActive })
      setEditingId(null)
      loadCategories()
    } catch (err: any) {
      alert(err.message)
    } finally { setEditLoading(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return
    try {
      await api.deleteCategory(id)
      loadCategories()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleToggleActive = async (cat: Category) => {
    try {
      await api.updateCategory(cat.id, { isActive: !cat.isActive })
      loadCategories()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">🏷️ Categories</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            + Add Category
          </button>
        </div>
        <div className="page-content">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : categories.length === 0 ? (
            <div className="empty-state"><div className="icon">🏷️</div><h3>No categories yet</h3></div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Description</th><th>Deal Count</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.id}>
                        <td className="font-bold">{cat.name}</td>
                        <td className="text-sm text-muted">{cat.description || '-'}</td>
                        <td>
                          <span className="badge badge-info">{cat.dealCount} deals</span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${cat.isActive ? 'btn-success' : 'btn-outline'}`}
                            onClick={() => handleToggleActive(cat)}
                            style={{ opacity: cat.isActive ? 1 : 0.6 }}
                          >
                            {cat.isActive ? '✅ Active' : '❌ Inactive'}
                          </button>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-sm btn-outline" onClick={() => startEdit(cat)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(cat.id, cat.name)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">➕ Add Category</div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Category Name *</label>
                <input value={createName} onChange={e => setCreateName(e.target.value)}
                  placeholder="e.g. Food & Beverages" required style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={createDesc} onChange={e => setCreateDesc(e.target.value)}
                  placeholder="Optional description..." rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId !== null && (
        <div className="modal-overlay" onClick={() => setEditingId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">✏️ Edit Category</div>
              <button className="modal-close" onClick={() => setEditingId(null)}>×</button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label>Category Name *</label>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  required style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }} />
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" checked={editActive} onChange={e => setEditActive(e.target.checked)} style={{ marginRight: 8 }} />
                  Active (visible in app)
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
