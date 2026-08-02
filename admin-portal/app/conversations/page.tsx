'use client'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface Conversation {
  id: string
  dealId?: string
  dealTitle?: string
  participants: { userId: string; fullName: string; avatarUrl?: string }[]
  messageCount: number
  lastMessage?: string
  lastMessageAt?: string
  createdAt: string
}

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  isRead: boolean
  createdAt: string
}

export default function ConversationsPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [msgPage, setMsgPage] = useState(1)
  const [msgLoading, setMsgLoading] = useState(false)
  const pageSize = 20

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    loadConvos()
  }, [page, search])

  const loadConvos = () => {
    setLoading(true)
    api.conversations({ search: search || undefined, page, pageSize })
      .then((res: any) => {
        if (res.success && res.data) {
          setConversations(res.data.items || [])
          setTotal(res.data.totalCount || 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const openChat = (convo: Conversation) => {
    setSelectedConvo(convo)
    setMessages([])
    setMsgPage(1)
    loadMessages(convo.id, 1)
  }

  const loadMessages = (convoId: string, pg: number) => {
    setMsgLoading(true)
    api.chatMessages(convoId, pg, 50)
      .then((res: any) => {
        if (res.success) setMessages(res.data || [])
      })
      .catch(() => {})
      .finally(() => setMsgLoading(false))
  }

  const loadMoreMessages = () => {
    if (!selectedConvo) return
    const nextPage = msgPage + 1
    setMsgPage(nextPage)
    api.chatMessages(selectedConvo.id, nextPage, 50)
      .then((res: any) => {
        if (res.success) setMessages(prev => [...prev, ...(res.data || [])])
      })
      .catch(() => {})
  }

  const totalPages = Math.ceil(total / pageSize)
  const currentUserId = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('admin_user') || '{}').id
    : null

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">💬 Chat Conversations</div>
          <div className="text-sm text-muted">{total} total conversations</div>
        </div>
        <div className="page-content">
          <div className="search-bar mb-4">
            <input placeholder="Search by participant name..." value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (setPage(1), loadConvos())} />
            <button className="btn btn-primary btn-sm" onClick={() => { setPage(1); loadConvos() }}>Search</button>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : conversations.length === 0 ? (
            <div className="empty-state"><div className="icon">💬</div><h3>No conversations found</h3></div>
          ) : (
            <>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Participants</th><th>Messages</th><th>Last Message</th><th>Last Active</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {conversations.map(c => (
                        <tr key={c.id}>
                          <td>
                            {c.participants.map(p => (
                              <div key={p.userId} className="text-sm">
                                <strong>{p.fullName}</strong>
                              </div>
                            ))}
                          </td>
                          <td className="text-center">{c.messageCount}</td>
                          <td className="text-sm text-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.lastMessage || '-'}
                          </td>
                          <td className="text-sm text-muted">
                            {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : '-'}
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline" onClick={() => openChat(c)}>
                              View Chat
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

      {selectedConvo && (
        <div className="modal-overlay" onClick={() => setSelectedConvo(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div className="modal-title">💬 Chat with {selectedConvo.participants.map(p => p.fullName).join(', ')}</div>
              <button className="modal-close" onClick={() => setSelectedConvo(null)}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {msgLoading ? (
                <div className="loading"><div className="spinner" /></div>
              ) : messages.length === 0 ? (
                <div className="empty-state"><div className="icon">💬</div><h3>No messages</h3></div>
              ) : (
                <>
                  {msgPage > 1 && (
                    <button className="btn btn-sm btn-outline mb-2" onClick={loadMoreMessages}>Load earlier messages</button>
                  )}
                  {messages.slice().reverse().map(m => {
                    const isOwn = m.senderId === currentUserId
                    return (
                      <div key={m.id} style={{
                        alignSelf: isOwn ? 'flex-end' : 'flex-start',
                        background: isOwn ? '#e3f2fd' : '#f5f5f5',
                        borderRadius: 12,
                        padding: '8px 12px',
                        maxWidth: '75%',
                      }}>
                        <div className="text-sm font-bold" style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>
                          {isOwn ? 'You' : m.senderName}
                        </div>
                        <div>{m.content}</div>
                        <div className="text-sm text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
