'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { User } from '@/types'

interface Props {
  currentUserId: string
  users: User[]
  onClose: () => void
  onAdd: () => void
}

export default function AddTaskModal({ currentUserId, users, onClose, onAdd }: Props) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'mid',
    assignee_id: '', start_date: '', due_date: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Başlık zorunludur.'); return }
    setLoading(true)
    const { error } = await supabase.from('tasks').insert({
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority,
      status: 'todo',
      assignee_id: form.assignee_id || null,
      created_by: currentUserId,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
    })
    setLoading(false)
    if (error) { setError('Görev eklenirken hata oluştu.'); return }
    onAdd()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
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
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400"
              placeholder="Görev adı..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Açıklama</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 resize-none"
              placeholder="Opsiyonel..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Öncelik</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 bg-white"
              >
                <option value="low">Düşük</option>
                <option value="mid">Orta</option>
                <option value="high">Yüksek</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Atanan kişi</label>
              <select
                value={form.assignee_id}
                onChange={e => set('assignee_id', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 bg-white"
              >
                <option value="">Seç...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Başlangıç</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Son tarih</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              İptal
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-teal-400 hover:bg-teal-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
