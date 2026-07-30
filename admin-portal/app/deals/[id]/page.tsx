'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { api } from '@/lib/api'

export default function DealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.push('/'); return }
    api.allDeals({ page: 1, pageSize: 1 }).then((res: any) => {
      // Find deal in pending or all lists
      const item = res.items?.find((x: any) => x.id === id)
      setDeal(item || null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="layout">
      <Sidebar />
      <main className="main"><div className="page-content"><div className="loading"><div className="spinner" /></div></div></main>
    </div>
  )

  if (!deal) return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="page-content">
          <div className="empty-state"><div className="icon">🏷️</div><h3>Deal not found</h3></div>
        </div>
      </main>
    </div>
  )

  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <div className="topbar">
          <div className="page-title">Deal #{deal.id}</div>
          <button className="btn btn-outline" onClick={() => router.push('/deals')}>← Back</button>
        </div>
        <div className="page-content">
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Title</div>
              <div className="detail-value">{deal.title}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Category</div>
              <div className="detail-value">{deal.category}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Organizer</div>
              <div className="detail-value">{deal.organizerName}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Organizer Email</div>
              <div className="detail-value">{deal.organizerEmail}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Group Price</div>
              <div className="detail-value">RM{Number(deal.groupPrice).toFixed(2)}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Original Price</div>
              <div className="detail-value">RM{Number(deal.originalPrice).toFixed(2)}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Min Group</div>
              <div className="detail-value">{deal.minGroup}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Current Group</div>
              <div className="detail-value">{deal.currentGroup}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Status</div>
              <div className="detail-value">
                <span className={`badge ${deal.status === 'Approved' ? 'badge-approved' : deal.status === 'Rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                  {deal.status}
                </span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-label">AI Moderation Score</div>
              <div className="detail-value">{deal.moderationScore ?? 'N/A'}</div>
            </div>
          </div>

          {deal.moderationReason && (
            <div className="card mt-4">
              <div className="card-title">AI Moderation Reason</div>
              <p className="mt-2 text-sm">{deal.moderationReason}</p>
            </div>
          )}

          {deal.hashtags?.length > 0 && (
            <div className="card mt-4">
              <div className="card-title">Hashtags</div>
              <div className="flex gap-2 mt-2">
                {deal.hashtags.map((h: string) => (
                  <span key={h} className="badge badge-pending">{h}</span>
                ))}
              </div>
            </div>
          )}

          {deal.imageUrls?.length > 0 && (
            <div className="card mt-4">
              <div className="card-title">Images ({deal.imageUrls.length})</div>
              <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
                {deal.imageUrls.map((url: string, i: number) => (
                  <img key={i} src={url} alt={`Image ${i + 1}`} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 12 }} />
                ))}
              </div>
            </div>
          )}

          <div className="card mt-4">
            <div className="card-title">Actions</div>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-success"
                onClick={async () => { await api.approveDeal(deal.id); router.push('/deals') }}>
                ✓ Approve
              </button>
              <button className="btn btn-danger"
                onClick={async () => { await api.rejectDeal(deal.id, 'Rejected by admin'); router.push('/deals') }}>
                ✗ Reject
              </button>
              <button className={`btn ${deal.isFeatured ? 'btn-outline' : 'btn-secondary'}`}
                onClick={async () => { await api.featureDeal(deal.id, !deal.isFeatured); setDeal(d => ({ ...d, isFeatured: !d.isFeatured })) }}>
                {deal.isFeatured ? 'Unfeature' : 'Feature'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
