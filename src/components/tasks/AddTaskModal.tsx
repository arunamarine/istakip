'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { User } from '@/types'

interface Props {
  currentUserId: string
  currentUserRole: string
  users: User[]
  onClose: () => void
  onAdd: () => void
}

export default function AddTaskModal({ currentUserId, currentUserRole, users, onClose, onAdd }: Props) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'mid', start_date: '', due_date: '',
  })
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleUser(id: string) {
    const targetUser = users.find(u => u.id === id)
    if (currentUserRole === 'staff' && targetUser?.role === 'manager') return
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Başlık zorunludur.'); return }
    setLoading(true)

    const staffAssignees = selectedUsers.filter(uid => {
      const u = users.find(x => x.id === uid)
      return u?.role === 'staff' || uid === currentUserId
    })

    const { data: task, error: taskError } = await supabase.from('tasks').insert({
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority,
      status: 'todo',
      assignee_id: staffAssignees[0] || currentUserId,
      created_by: currentUserId,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
    }).select().single()

    if (taskError || !task) { setError('Görev eklenirken hata oluştu.'); setLoading(false); return }

    if (staffAssignees.length > 0) {
      await supabase.from('task_assignees').insert(
        staffAssignees.map(uid => ({ task_id: task.id, user_id: uid }))
      )
      for (const uid of staffAssignees) {
        if (uid !== currentUserId) {
          await fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: uid,
              message: `📋 <b>Yeni Görev Atandı</b>\n\n${form.title}\n\n🔗 <a href="https://istakip-sigma.vercel.app">Uygulamayı Aç</a>`,
            }),
          }).catch(() => {})
        }
      }
    }

    // Yöneticilere istek gönder (sadece çalışanlar için)
    if (currentUserRole === 'staff') {
      const managerIds = users.filter(u => u.role === 'manager').map(u => u.id)
      for (const managerId of managerIds) {
        await supabase.from('task_requests').insert({
          task_id: task.id,
          requester_id: currentUserId,
          manager_id: managerId,
          status: 'pending',
        })
        await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: managerId,
            message: `🔔 <b>Yeni Görev İsteği</b>\n\n${users.find(u=>u.id===currentUserId)?.name} yeni bir görev oluşturdu:\n\n📋 ${form.title}\n\nOnaylamak için uygulamayı açın.\n\n🔗 <a href="https://istakip-sigma.vercel.app/dashboard/requests">Bekleyen İstekler</a>`,
          }),
        }).catch(() => {})
      }
    }

    setLoading(false)
    onAdd()
    onClose()
  }

  const managers = users.filter(u => u.role === 'manager')
  const staff = users.filter(u => u.role === 'staff')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-100">
          <h2 className="text-[17px] font-semibold text-gray-900">Yeni Görev</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Başlık *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400"
              placeholder="Görev adı..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Açıklama</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 resize-none"
              placeholder="Opsiyonel..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Öncelik</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 bg-white">
              <option value="low">Düşük</option>
              <option value="mid">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Atanan Kişiler
              {currentUserRole === 'staff' && (
                <span className="ml-2 text-[10px] text-amber-600 font-normal">Yöneticiler için otomatik onay isteği gönderilir</span>
              )}
            </label>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {staff.map(u => (
                  <div key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                      selectedUsers.includes(u.id) ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-teal-200'
                    }`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                      style={{ background: u.avatar_color, color: '#1f2937' }}>
                      {u.name.split(' ').map((p:string) => p[0]).join('').slice(0,2)}
                    </div>
                    <span className="text-xs font-medium text-gray-700 truncate">{u.name.split(' ')[0]}</span>
                    {selectedUsers.includes(u.id) && <span className="ml-auto text-teal-500 text-xs">✓</span>}
                  </div>
                ))}
              </div>
              {currentUserRole === 'manager' && (
                <div className="grid grid-cols-2 gap-2">
                  {managers.map(u => (
                    <div key={u.id}
                      onClick={() => toggleUser(u.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                        selectedUsers.includes(u.id) ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-teal-200'
                      }`}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: u.avatar_color, color: '#1f2937' }}>
                        {u.name.split(' ').map((p:string) => p[0]).join('').slice(0,2)}
                      </div>
                      <span className="text-xs font-medium text-gray-700 truncate">{u.name.split(' ')[0]}</span>
                      <span className="text-[9px] text-teal-500 ml-1">Yön.</span>
                      {selectedUsers.includes(u.id) && <span className="ml-auto text-teal-500 text-xs">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Başlangıç</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Son tarih</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
              İptal
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-teal-400 hover:bg-teal-600 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {currentUserRole === 'staff' ? 'Kaydet & Yöneticiye Bildir' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}