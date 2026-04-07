'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Send, Trash2, Calendar, Pencil, Check, UserPlus } from 'lucide-react'
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
  { value: 'done',      label: 'Tamamlandi' },
  { value: 'cancelled', label: 'Iptal Edildi' },
]

const PRIORITY_OPTIONS = [
  { value: 'low',  label: 'Dusuk' },
  { value: 'mid',  label: 'Orta' },
  { value: 'high', label: 'Yuksek' },
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
  const [assignees, setAssignees] = useState<string[]>([])
  const [editingAssignees, setEditingAssignees] = useState(false)
  const supabase = createClient()
  const commentEndRef = useRef<HTMLDivElement>(null)

  const canEdit = currentUser.role === 'manager' || currentUser.id === task.assignee_id

  useEffect(() => {
    loadComments()
    loadAssignees()
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

  async function loadAssignees() {
    const { data } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', task.id)
    if (data) setAssignees(data.map((a: any) => a.user_id))
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

  async function handleSaveAssignees(newAssignees: string[]) {
    await supabase.from('task_assignees').delete().eq('task_id', task.id)
    if (newAssignees.length > 0) {
      await supabase.from('task_assignees').insert(
        newAssignees.map(uid => ({ task_id: task.id, user_id: uid }))
      )
      await supabase.from('tasks').update({ assignee_id: newAssignees[0] }).eq('id', task.id)
      for (const uid of newAssignees) {
        if (uid !== currentUser.id) {
          await fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: uid,
              message: `📋 <b>Goreve Atandiniz</b>\n\n${task.title}\n\n🔗 <a href="https://istakip-sigma.vercel.app">Uygulamayi Ac</a>`,
            }),
          }).catch(() => {})
        }
      }
      // Yoneticilere bildir
      const managers = users.filter(u => u.role === 'manager' && u.id !== currentUser.id)
      for (const manager of managers) {
        await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: manager.id,
            message: `👥 <b>Gorev Atamalari Guncellendi</b>\n\n${task.title}\n\n🔗 <a href="https://istakip-sigma.vercel.app">Uygulamayi Ac</a>`,
          }),
        }).catch(() => {})
      }
    }
    setAssignees(newAssignees)
    setEditingAssignees(false)
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
            message: `🔄 <b>Gorev Durumu Guncellendi</b>\n\n📋 ${task.title}\n\nYeni durum: ${{ todo: '⏳ Bekliyor', doing: '🔵 Devam Ediyor', done: '✅ Tamamlandi', cancelled: '❌ Iptal Edildi' }[newStatus] || newStatus}\n\n🔗 <a href="https://istakip-sigma.vercel.app">Uygulamayi Ac</a>`,
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
    if (!confirm('Bu gorevi silmek istediginize emin misiniz?')) return
    await supabase.from('tasks').delete().eq('id', task.id)
    onClose()
    onUpdate()
  }

  const assigneeUsers = users.filter(u => assignees.includes(u.id))
  const creator = users.find(u => u.id === task.created_by)

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl">
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
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" title="Duzenle">
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
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Aciklama</label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Oncelik</label>
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
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Aciklama</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
                </div>
              )}

              {/* Atanan kisiler */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Atanan Kisiler</p>
                  {(currentUser.role === 'manager' || currentUser.id === task.created_by) && (
                    <button onClick={() => setEditingAssignees(!editingAssignees)}
                      className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800">
                      <UserPlus className="w-3.5 h-3.5" />
                      {editingAssignees ? 'Iptal' : 'Duzenle'}
                    </button>
                  )}
                </div>
                {editingAssignees ? (
                  <div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {users.map(u => {
                        const selected = assignees.includes(u.id)
                        return (
                          <div key={u.id}
                            onClick={() => setAssignees(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all',
                              selected ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-teal-200'
                            )}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                              style={{ background: u.avatar_color, color: '#1f2937' }}>
                              {getInitials(u.name)}
                            </div>
                            <span className="text-xs font-medium text-gray-700 truncate">{u.name.split(' ')[0]}</span>
                            {selected && <span className="ml-auto text-teal-500 text-xs">✓</span>}
                          </div>
                        )
                      })}
                    </div>
                    <button onClick={() => handleSaveAssignees(assignees)}
                      className="w-full py-2 bg-teal-400 hover:bg-teal-600 text-white text-sm font-medium rounded-xl">
                      Kaydet
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assigneeUsers.length === 0 ? (
                      <span className="text-sm text-gray-400">Atanmamis</span>
                    ) : assigneeUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ background: u.avatar_color, color: '#1f2937' }}>
                          {getInitials(u.name)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{u.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Olusturan</p>
                <span className="text-sm font-medium text-gray-800">{creator?.name ?? '—'}</span>
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

          {!editing && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                Yorumlar ({comments.length})
              </p>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {comments.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Henuz yorum yok.</p>
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
              <Trash2 className="w-3.5 h-3.5" /> Gorevi sil
            </button>
          </div>
        )}
      </div>
    </div>
  )
}