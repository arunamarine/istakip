'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'
import { Check, X, UserCheck } from 'lucide-react'

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [redirectingId, setRedirectingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (profile) setCurrentUser(profile)
      const { data: allUsers } = await supabase.from('users').select('*').order('name')
      if (allUsers) setUsers(allUsers)
      loadRequests(user.id, profile?.role)
    })
  }, [])

  async function loadRequests(userId: string, role: string) {
    const query = supabase
      .from('task_requests')
      .select('*, task:tasks(*), requester:users!task_requests_requester_id_fkey(*)')
      .order('created_at', { ascending: false })
    const { data } = role === 'manager'
      ? await query.eq('manager_id', userId)
      : await query.eq('requester_id', userId)
    if (data) setRequests(data)
    setLoading(false)
  }

  async function handleApprove(req: any) {
    await supabase.from('task_requests').update({ status: 'approved' }).eq('id', req.id)
    await supabase.from('task_assignees').upsert({ task_id: req.task_id, user_id: currentUser.id })
await supabase.from('notifications').insert({
      user_id: req.requester_id,
      title: 'Görev İsteği Onaylandı',
      body: `"${req.task?.title}" görevi onaylandı. ${currentUser.name} göreve dahil oldu.`,
      task_id: req.task_id,
    })
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: req.requester_id,
        message: `✅ Görev İsteği Onaylandı\n\n${req.task?.title}\n\n${currentUser.name} göreve dahil oldu.\n\nhttps://istakip-sigma.vercel.app`,
      }),
    }).catch(() => {})
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r))
    setRedirectingId(null)
  }

  async function handleReject(req: any) {
    await supabase.from('task_requests').update({ status: 'rejected' }).eq('id', req.id)
  await supabase.from('notifications').insert({
      user_id: req.requester_id,
      title: 'Görev İsteği Reddedildi',
      body: `"${req.task?.title}" görev isteğiniz reddedildi.`,
      task_id: req.task_id,
    })  
await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: req.requester_id,
        message: `❌ Görev İsteği Reddedildi\n\n${req.task?.title}\n\nhttps://istakip-sigma.vercel.app`,
      }),
    }).catch(() => {})
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r))
    setRedirectingId(null)
  }

  async function handleRedirect(req: any, targetUserId: string) {
    const targetUser = users.find(u => u.id === targetUserId)
    await supabase.from('task_requests').update({ status: 'approved' }).eq('id', req.id)
    await supabase.from('task_assignees').upsert({ task_id: req.task_id, user_id: targetUserId })
    await supabase.from('tasks').update({ assignee_id: targetUserId }).eq('id', req.task_id)
await supabase.from('notifications').insert([
      {
        user_id: req.requester_id,
        title: 'Görev İsteği Onaylandı',
        body: `"${req.task?.title}" görevi ${targetUser?.name} kişisine yönlendirildi.`,
        task_id: req.task_id,
      },
      {
        user_id: targetUserId,
        title: 'Görev Size Atandı',
        body: `"${req.task?.title}" görevi ${currentUser.name} tarafından size yönlendirildi.`,
        task_id: req.task_id,
      }
    ])    
await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: targetUserId,
        message: `📋 Görev Size Yönlendirildi\n\n${req.task?.title}\n\n${currentUser.name} bu görevi size atadı.\n\nhttps://istakip-sigma.vercel.app`,
      }),
    }).catch(() => {})
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: req.requester_id,
        message: `✅ Görev İsteği Onaylandı\n\n${req.task?.title}\n\nGörev ${targetUser?.name} kişisine atandı.\n\nhttps://istakip-sigma.vercel.app`,
      }),
    }).catch(() => {})
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r))
    setRedirectingId(null)
  }

  const pending = requests.filter(r => r.status === 'pending')
  const others  = requests.filter(r => r.status !== 'pending')

  if (loading) return <div className="flex items-center justify-center h-40 text-gray-400">Yükleniyor...</div>

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-5">
        {currentUser?.role === 'manager' ? 'Bekleyen Görev İstekleri' : 'Gönderdiğim İstekler'}
      </h1>

      {pending.length === 0 && others.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400">
          Henüz istek bulunmuyor.
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Bekleyen ({pending.length})</h2>
          <div className="space-y-3">
            {pending.map(req => (
              <div key={req.id} className="bg-white border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: req.requester?.avatar_color, color: '#1f2937' }}>
                    {req.requester ? getInitials(req.requester.name) : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{req.task?.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{req.requester?.name} tarafından oluşturuldu</p>
                  </div>
                  {currentUser?.role === 'manager' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-400 hover:bg-teal-600 text-white text-xs font-medium rounded-xl transition-colors">
                        <Check className="w-3.5 h-3.5" /> Onayla
                      </button>
                      <button onClick={() => setRedirectingId(redirectingId === req.id ? null : req.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium rounded-xl transition-colors border border-blue-200">
                        <UserCheck className="w-3.5 h-3.5" /> Yönlendir
                      </button>
                      <button onClick={() => handleReject(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-medium rounded-xl transition-colors">
                        <X className="w-3.5 h-3.5" /> Reddet
                      </button>
                    </div>
                  )}
                </div>

                {/* Yönlendirme paneli */}
                {redirectingId === req.id && currentUser?.role === 'manager' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Kime yönlendirilsin?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {users.filter(u => u.id !== req.requester_id).map(u => (
                        <button key={u.id}
                          onClick={() => handleRedirect(req, u.id)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all text-left">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                            style={{ background: u.avatar_color, color: '#1f2937' }}>
                            {getInitials(u.name)}
                          </div>
                          <span className="text-xs text-gray-700 truncate">{u.name.split(' ')[0]}</span>
                          {u.role === 'manager' && <span className="text-[9px] text-teal-500 ml-auto">Yön.</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-3">Geçmiş</h2>
          <div className="space-y-2">
            {others.map(req => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 opacity-70">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{req.task?.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{req.requester?.name}</p>
                </div>
                <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${
                  req.status === 'approved' ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-500'
                }`}>
                  {req.status === 'approved' ? '✓ Onaylandı' : '✕ Reddedildi'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}