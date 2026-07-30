'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Array<{ key: string; value: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [tab, setTab] = useState<'app' | 'admins'>('app')
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', fullName: '', role: 'Viewer' })
  const [adminLoading, setAdminLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/') }
    else {
      loadSettings()
      loadAdmins()
    }
  }, [])

  const loadSettings = () => {
    setLoading(true)
    api.settings()
      .then((res: any) => { if (res.data) setSettings(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadAdmins = () => {
    api.adminUsers().then((res: any) => { if (Array.isArray(res.data)) setAdminUsers(res.data) }).catch(() => {})
  }

  const updateSetting = async (key: string, value: string) => {
    setSaving(key)
    try {
      await api.updateSetting(key, value)
      setSettings(s => s.map(x => x.key === key ? { ...x, value } : x))
    } catch { alert('Failed to save') }
    finally { setSaving(null) }
  }

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminLoading(true)
    try {
      await api.createAdminUser(newAdmin)
      setNewAdmin({ email: '', password: '', fullName: '', role: 'Viewer' })
      loadAdmins()
    } catch (err: any) { alert(err.message) }
    finally { setAdminLoading(false) }
  }

  const deleteAdmin = async (id: number) => {
    if (!confirm('Delete this admin user?')) return
    try {
      await api.deleteAdminUser(id)
      setAdminUsers(a => a.filter(x => x.id !== id))
    } catch (err: any) { alert(err.message) }
  }

  const pilots = settings.filter(s => s.key.startsWith('PilotMode'))
  const ai = settings.filter(s => s.key.startsWith('AI'))
  const deal = settings.filter(s => s.key.startsWith('Deal'))

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">Settings</div>
        </div>
        <div className="page-content">
          <div className="flex gap-2 mb-4">
            <button className={`btn ${tab === 'app' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('app')}>App Settings</button>
            <button className={`btn ${tab === 'admins' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('admins')}>Admin Users</button>
          </div>

          {tab === 'app' && (
            loading ? <div className="loading"><div className="spinner" /></div> :
            <>
              <div className="card">
                <div className="card-header"><div className="card-title">🤸 Pilot Mode</div></div>
                {pilots.map(s => (
                  <div key={s.key} className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div className="font-bold">{s.key.replace('PilotMode:', '')}</div>
                      <div className="text-xs text-muted">{s.key}</div>
                    </div>
                    <label className="switch">
                      <input type="checkbox"
                        checked={s.value === 'true'}
                        onChange={() => updateSetting(s.key, s.value === 'true' ? 'false' : 'true')}
                        disabled={saving === s.key} />
                    </label>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-header"><div className="card-title">🤖 AI Moderation</div></div>
                {ai.map(s => (
                  <div key={s.key} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold">{s.key.replace('AI:', '')}</div>
                      {saving === s.key ? <span className="text-sm text-muted">Saving...</span> : null}
                    </div>
                    <input
                      value={s.value}
                      onBlur={e => updateSetting(s.key, e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-header"><div className="card-title">🏷️ Deal Rules</div></div>
                {deal.map(s => (
                  <div key={s.key} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold">{s.key.replace('Deal:', '')}</div>
                      {saving === s.key ? <span className="text-sm text-muted">Saving...</span> : null}
                    </div>
                    <input
                      value={s.value}
                      onBlur={e => updateSetting(s.key, e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'admins' && (
            <>
              <div className="card">
                <div className="card-header"><div className="card-title">Add Admin User</div></div>
                <form onSubmit={createAdmin}>
                  <div className="detail-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input value={newAdmin.fullName} onChange={e => setNewAdmin(n => ({ ...n, fullName: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" value={newAdmin.email} onChange={e => setNewAdmin(n => ({ ...n, email: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input type="password" value={newAdmin.password} onChange={e => setNewAdmin(n => ({ ...n, password: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label>Role</label>
                      <select value={newAdmin.role} onChange={e => setNewAdmin(n => ({ ...n, role: e.target.value }))}>
                        <option value="Viewer">Viewer</option>
                        <option value="Moderator">Moderator</option>
                        <option value="SuperAdmin">Super Admin</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary mt-4" disabled={adminLoading}>
                    {adminLoading ? 'Creating...' : 'Create Admin User'}
                  </button>
                </form>
              </div>

              <div className="card">
                <div className="card-header"><div className="card-title">Admin Users</div></div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Last Login</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.id}>
                          <td className="font-bold">{u.fullName}</td>
                          <td>{u.email}</td>
                          <td><span className={`badge ${u.role === 'SuperAdmin' ? 'badge-approved' : 'badge-pending'}`}>{u.role}</span></td>
                          <td><span className={`badge ${u.isActive ? 'badge-active' : 'badge-inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                          <td className="text-sm text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                          <td>
                            {u.id !== 1 && (
                              <button className="btn btn-sm btn-danger" onClick={() => deleteAdmin(u.id)}>Delete</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
