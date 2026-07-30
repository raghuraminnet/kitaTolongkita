'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api, AiConfig, AiConfigInput } from '@/lib/api'
import { useRouter } from 'next/navigation'

type Tab = 'account' | 'ai-configs' | 'moderation' | 'admins'

export default function SettingsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('account')

  // Account
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [cpMsg, setCpMsg] = useState('')
  const [cpLoading, setCpLoading] = useState(false)

  // AI Configs
  const [configs, setConfigs] = useState<AiConfig[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<AiConfigInput>({ name: '', provider: 'azure-openai', apiKey: '', endpoint: '', deploymentName: '', modelName: '' })
  const [createLoading, setCreateLoading] = useState(false)

  // Moderation Rules
  const [rules, setRules] = useState<any[]>([])
  const [rulesLoading, setRulesLoading] = useState(false)

  // Admin Users
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', fullName: '', role: 'Viewer' })
  const [adminLoading, setAdminLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/') }
    else { loadAll() }
  }, [])

  const loadAll = async () => {
    try {
      const [aiRes, rulesRes, adminRes] = await Promise.all([
        api.aiConfigs(),
        api.moderationRules(),
        api.adminUsers(),
      ]) as [{ data: AiConfig[] }, { data: any[] }, { data: any[] }]
      if (aiRes.data) setConfigs(aiRes.data)
      if (rulesRes.data) setRules(rulesRes.data)
      if (adminRes.data) setAdminUsers(adminRes.data)
    } catch {}
  }

  // ── Change Password ──────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setCpLoading(true)
    setCpMsg('')
    try {
      await api.changePassword(oldPw, newPw)
      setCpMsg('Password changed successfully!')
      setOldPw('')
      setNewPw('')
    } catch (err: any) {
      setCpMsg(err.message)
    } finally { setCpLoading(false) }
  }

  // ── AI Configs ──────────────────────────────────────────────────────────
  const testConnection = async (form: AiConfigInput) => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const result = await api.testAiConnection({
        provider: form.provider,
        apiKey: form.apiKey || undefined,
        endpoint: form.endpoint || undefined,
        deploymentName: form.deploymentName || undefined,
        modelName: form.modelName || undefined,
      })
      setTestResult(result)
    } catch (err: any) {
      setTestResult({ success: false, message: err.message })
    } finally { setTestLoading(false) }
  }

  const createAiConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      await api.createAiConfig(createForm)
      setShowCreate(false)
      setCreateForm({ name: '', provider: 'azure-openai', apiKey: '', endpoint: '', deploymentName: '', modelName: '' })
      const res = await api.aiConfigs() as { data: AiConfig[] }
      if (res.data) setConfigs(res.data)
    } catch (err: any) { alert(err.message) }
    finally { setCreateLoading(false) }
  }

  const toggleAiActive = async (id: number, currentActive: boolean) => {
    try {
      await api.updateAiConfig(id, { isActive: !currentActive })
      const res = await api.aiConfigs() as { data: AiConfig[] }
      if (res.data) setConfigs(res.data)
    } catch (err: any) { alert(err.message) }
  }

  const deleteAiConfig = async (id: number) => {
    if (!confirm('Delete this AI config?')) return
    try {
      await api.deleteAiConfig(id)
      const res = await api.aiConfigs() as { data: AiConfig[] }
      if (res.data) setConfigs(res.data)
    } catch (err: any) { alert(err.message) }
  }

  // ── Moderation Rules ───────────────────────────────────────────────────
  const updateRule = async (id: number, value: string, isActive: boolean) => {
    try {
      await api.updateModerationRule(id, { value, isActive })
      const res = await api.moderationRules() as { data: any[] }
      if (res.data) setRules(res.data)
    } catch (err: any) { alert(err.message) }
  }

  // ── Admin Users ─────────────────────────────────────────────────────────
  const createAdminUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminLoading(true)
    try {
      await api.createAdminUser(newAdmin)
      setNewAdmin({ email: '', password: '', fullName: '', role: 'Viewer' })
      const res = await api.adminUsers() as { data: any[] }
      if (res.data) setAdminUsers(res.data)
    } catch (err: any) { alert(err.message) }
    finally { setAdminLoading(false) }
  }

  const deleteAdmin = async (id: number) => {
    if (!confirm('Delete this admin user?')) return
    try {
      await api.deleteAdminUser(id)
      const res = await api.adminUsers() as { data: any[] }
      if (res.data) setAdminUsers(res.data)
    } catch (err: any) { alert(err.message) }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'account', label: '👤 Account' },
    { id: 'ai-configs', label: '🤖 AI Configs' },
    { id: 'moderation', label: '⚖️ Moderation Rules' },
    { id: 'admins', label: '🔐 Admin Users' },
  ]

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar"><div className="page-title">Settings</div></div>
        <div className="page-content">
          <div className="flex gap-2 mb-4">
            {TABS.map(t => (
              <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {/* ── Account ── */}
          {tab === 'account' && (
            <div className="card" style={{ maxWidth: 480 }}>
              <div className="card-title">Change Password</div>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={6} />
                </div>
                {cpMsg && <div className={`alert ${cpMsg.includes('success') ? 'alert-success' : 'alert-error'}`}>{cpMsg}</div>}
                <button type="submit" className="btn btn-primary" disabled={cpLoading}>
                  {cpLoading ? 'Saving...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {/* ── AI Configs ── */}
          {tab === 'ai-configs' && (
            <>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">🤖 AI Provider Configurations</div>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
                    {showCreate ? '✕ Cancel' : '+ Add Config'}
                  </button>
                </div>
                <p className="text-sm text-muted mb-4">Only one config can be active at a time. Active config is used by the app API.</p>

                {testResult && (
                  <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`}>
                    {testResult.message}
                  </div>
                )}

                {showCreate && (
                  <form onSubmit={createAiConfig} className="card" style={{ background: 'var(--surface-2)', marginBottom: 24 }}>
                    <div className="card-title mb-4">New AI Config</div>
                    <div className="detail-grid">
                      <div className="form-group">
                        <label>Config Name</label>
                        <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Azure Production" />
                      </div>
                      <div className="form-group">
                        <label>Provider</label>
                        <select value={createForm.provider}
                          onChange={e => setCreateForm(f => ({ ...f, provider: e.target.value }))}>
                          <option value="azure-openai">Azure OpenAI</option>
                          <option value="openai">OpenAI Direct</option>
                          <option value="anthropic">Anthropic Claude</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>API Key</label>
                        <input type="password" value={createForm.apiKey || ''}
                          onChange={e => setCreateForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="sk-..." />
                      </div>
                      {(createForm.provider === 'azure-openai') && (
                        <>
                          <div className="form-group">
                            <label>Endpoint URL</label>
                            <input value={createForm.endpoint || ''}
                              onChange={e => setCreateForm(f => ({ ...f, endpoint: e.target.value }))}
                              placeholder="https://your-resource.openai.azure.com" />
                          </div>
                          <div className="form-group">
                            <label>Deployment Name</label>
                            <input value={createForm.deploymentName || ''}
                              onChange={e => setCreateForm(f => ({ ...f, deploymentName: e.target.value }))}
                              placeholder="gpt-4o-mini" />
                          </div>
                        </>
                      )}
                      {(createForm.provider === 'openai' || createForm.provider === 'anthropic') && (
                        <div className="form-group">
                          <label>Model Name</label>
                          <input value={createForm.modelName || ''}
                            onChange={e => setCreateForm(f => ({ ...f, modelName: e.target.value }))}
                            placeholder={createForm.provider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-20250514'} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button type="button" className="btn btn-outline"
                        disabled={testLoading}
                        onClick={() => testConnection(createForm)}>
                        {testLoading ? 'Testing...' : '🔗 Test Connection'}
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={createLoading}>
                        {createLoading ? 'Creating...' : 'Create Config'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Provider</th><th>Model/Deployment</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {configs.map(c => (
                        <tr key={c.id}>
                          <td className="font-bold">{c.name}</td>
                          <td><span className="badge badge-pending">{c.provider}</span></td>
                          <td className="text-sm text-muted">{c.deploymentName || c.modelName || '-'}</td>
                          <td>
                            <span className={`badge ${c.isActive ? 'badge-active' : 'badge-inactive'}`}>
                              {c.isActive ? '✓ Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              {!c.isActive && (
                                <button className="btn btn-sm btn-success" onClick={() => toggleAiActive(c.id, c.isActive)}>
                                  Activate
                                </button>
                              )}
                              <button className="btn btn-sm btn-outline"
                                onClick={() => { const form = { name: c.name, provider: c.provider, apiKey: '', endpoint: c.endpoint || '', deploymentName: c.deploymentName || '', modelName: c.modelName || '' }; setCreateForm(form); setShowCreate(true); }}>
                                Edit
                              </button>
                              <button className="btn btn-sm btn-danger"
                                disabled={c.isActive}
                                onClick={() => deleteAiConfig(c.id)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {configs.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 32 }}>No AI configs yet. Add one above.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Moderation Rules ── */}
          {tab === 'moderation' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">⚖️ Moderation & App Rules</div>
              </div>
              {['ai', 'deal', 'pilot'].map(cat => (
                <div key={cat}>
                  <div className="nav-section" style={{ textTransform: 'capitalize' }}>{cat} Rules</div>
                  {rules.filter((r: any) => r.category === cat).map((rule: any) => (
                    <div key={rule.id} className="flex items-center justify-between" style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div className="font-bold text-sm">{rule.key.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-muted">{rule.description}</div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {rule.category === 'ai' || rule.category === 'deal' ? (
                          <input
                            value={rule.value}
                            style={{ width: 80, padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, textAlign: 'center' }}
                            onBlur={e => updateRule(rule.id, e.target.value, rule.isActive)}
                          />
                        ) : (
                          <span className="font-bold">{rule.value}</span>
                        )}
                        <label className="switch">
                          <input type="checkbox" checked={rule.isActive}
                            onChange={e => updateRule(rule.id, rule.value, e.target.checked)} />
                          <span className="slider" />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── Admin Users ── */}
          {tab === 'admins' && (
            <>
              <div className="card">
                <div className="card-title mb-4">Add Admin User</div>
                <form onSubmit={createAdminUser}>
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
                      <input type="password" value={newAdmin.password} onChange={e => setNewAdmin(n => ({ ...n, password: e.target.value }))} required minLength={6} />
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
                <div className="card-title mb-4">Admin Users</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Last Login</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((u: any) => (
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
