'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Send, Trash2, Calendar, Pencil, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn, getInitials, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/utils'
import type { Task, User as UserType, Comment } from '@/types'

const PRIORITY_STYLES_MAP: Record<string, string> = {
  high: 'bg-red-50 text-red-700',
  mid:  'bg-amber-50 text-amber-700',
  low:  'bg-green-50 text-green-700',
}

const STATUS_OPTIONS = [
  { value: 'todo',      label: 'Bekliyor' },
  { value: 'doing',     label: 'Devam Ediyor' },
  { value: 'done',      label: 'Tamamlandı' },
  { value: 'cancelled', label: 'İptal Edildi' },
]

const PRIORITY_OPTIONS = [
  { value: 'low',  label: 'Düşük' },
  { value: 'mid',  label: 'Orta' },
  { value: 'high', label: 'Yüksek' },
]

interface Props {
  task: Task
  currentUser: UserType
  users: UserType[]
  onClose: () => void
  onUpdate: () => void
}

export default function TaskDetailModal({ task, currentUser, users, onClose, onUpdate }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(task.status)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description || '')
  const [editPriority, setEditPriority] = useState(task.priority)
  const [editDue, setEditDue] = useState(task.due_date || '')
  const supabase = createClient()
  const commentEndRef = useRef<HTMLDivElement>(null)

  const canEdit = currentUser.role === 'manager' || currentUser.id === task.assignee_id

  useEffect(() => {
    loadComments()
    const channel = supabase
      .channel(`comments-${task.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'comments',
        filter: `task_id=eq.${task.id}`,
      }, () => loadComments())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [task.id])

  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('*, user:users(*)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
  }

  async function handleSaveEdit() {
    await supabase.from('tasks').update({
      title: editTitle,
      description: editDesc || null,
      priority: editPriority,
      due_date: editDue || null,
    }).eq('id', task.id)
    setEditing(false)
    onUpdate()
  }

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus as any)
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    if (!error) {
      try {
        await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.id,
            message: `🔄 <b>Görev Durumu Güncellendi</b>\n\n📋 ${task.title}\n\nYeni durum: ${{ todo: '⏳ Bekliyor', doing: '🔵 Devam Ediyor', done: '✅ Tamamlandı', cancelled: '❌ İptal Edildi' }[newStatus] || newStatus}\n\n🔗 <a href="https://istakip-sigma.vercel.app">Uygulamayı Aç</a>`,
          }),
        })
      } catch (e) {}
      onUpdate()
    }
  }

  async function handleSendComment() {
    if (!commentText.trim()) return
    setSending(true)
    await supabase.from('comments').insert({
      task_id: task.id,
      user_id: currentUser.id,
      content: commentText.trim(),
    })
    setCommentText('')
    setSending(false)
  }

  async function handleDelete() {
    if (!confirm('Bu görevi silmek istediğinize emin misiniz?')) return
    await supabase.from('tasks').delete().eq('id', task.id)
    onClose()
    onUpdate()
  }

  const assignee = users.find(u => u.id === task.assignee_id)
  const creator  = users.find(u => u.id === task.created_by)

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-4 border-b border-gray-100">
          <div className="flex-1">
            {editing ? (
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full text-[17px] font-semibold text-gray-900 border-b border-teal-400 focus:outline-none pb-1"
              />
            ) : (
              <h2 className="text-[17px] font-semibold text-gray-900 leading-snug">{task.title}</h2>
            )}
            {!editing && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', PRIORITY_STYLES_MAP[task.priority])}>
                  {PRIORITY_LABELS[task.priority]}
                </span>
                {task.due_date && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />{task.due_date}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" title="Düzenle">
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {editing && (
              <button onClick={handleSaveEdit} className="p-1.5 rounded-lg text-teal-500 hover:bg-teal-50" title="Kaydet">
                <Check className="w-4 h-4" />
              </button>
            )}
            <button onClick={editing ? () => setEditing(false) : onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Edit fields */}
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Açıklama</label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Öncelik</label>
                  <select value={editPriority} onChange={e => setEditPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 bg-white">
                    {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Son tarih</label>
                  <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-teal-400" />
                </div>
              </div>
              <button onClick={handleSaveEdit}
                className="w-full py-2 bg-teal-400 hover:bg-teal-600 text-white text-sm font-medium rounded-xl transition-colors">
                Kaydet
              </button>
            </div>
          ) : (
            <>
              {task.description && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Açıklama</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Atanan</p>
                  {assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: assignee.avatar_color, color: '#1f2937' }}>
                        {getInitials(assignee.name)}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{assignee.name}</span>
                    </div>
                  ) : <span className="text-sm text-gray-400">Atanmamış</span>}
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Oluşturan</p>
                  <span className="text-sm font-medium text-gray-800">{creator?.name ?? '—'}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Durum</p>
                {canEdit ? (
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => handleStatusChange(opt.value)}
                        className={cn(
                          'flex-1 py-2 text-xs font-medium rounded-lg border transition-all',
                          status === opt.value
                            ? 'bg-teal-400 text-white border-teal-400'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-teal-300'
                        )}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm font-medium text-gray-800">{STATUS_LABELS[status]}</span>
                )}
              </div>
            </>
          )}

          {/* Comments */}
          {!editing && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                Yorumlar ({comments.length})
              </p>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {comments.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Henüz yorum yok.</p>
                )}
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: c.user?.avatar_color ?? '#E5E7EB', color: '#1f2937' }}>
                      {c.user ? getInitials(c.user.name) : '?'}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-gray-800">{c.user?.name}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(c.created_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{c.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={commentEndRef} />
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
                  placeholder="Yorum ekle..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 transition-colors"
                />
                <button onClick={handleSendComment} disabled={sending || !commentText.trim()}
                  className="px-3 py-2 bg-teal-400 hover:bg-teal-600 text-white rounded-xl transition-colors disabled:opacity-40">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {currentUser.role === 'manager' && (
          <div className="p-4 pt-0 border-t border-gray-100 mt-2">
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded">
              <Trash2 className="w-3.5 h-3.5" /> Görevi sil
            </button>
          </div>
        )}
      </div>
    </div>
  )
}