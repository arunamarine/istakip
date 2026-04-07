'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'
import { addDays, subDays, format, differenceInDays, parseISO, isToday } from 'date-fns'
import { tr } from 'date-fns/locale'
import { X } from 'lucide-react'

const WIN_DAYS = 28
const STATUS_BAR_COLORS: Record<string, string> = {
  todo:  '#D1D5DB',
  doing: '#FBBF24',
  done:  '#34D399',
  cancelled: '#FCA5A5',
}

export default function TeamPage() {
  const [users, setUsers] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [windowStart, setWindowStart] = useState(() => subDays(new Date(), 4))
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('users').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) setCurrentUser(data)
      })
    })
    supabase.from('users').select('*').order('name').then(({ data }) => { if (data) setUsers(data) })
    supabase.from('tasks').select('*, assignee:users!tasks_assignee_id_fkey(*)').then(({ data }) => { if (data) setTasks(data) })
  }, [])

  const canViewProfile = currentUser?.email === 'erhan.gurses@aruna-tr.com' || currentUser?.email === 'hasan.yetginer@aruna-tr.com' || currentUser?.role === 'manager'

  const days = Array.from({ length: WIN_DAYS }, (_, i) => addDays(windowStart, i))
  const todayPct = differenceInDays(new Date(), windowStart) / WIN_DAYS * 100

  function barStyle(task: any) {
    if (!task.start_date || !task.due_date) return null
    const s = parseISO(task.start_date)
    const e = addDays(parseISO(task.due_date), 1)
    const leftPct  = Math.max(0, differenceInDays(s, windowStart) / WIN_DAYS * 100)
    const rightPct = Math.min(100, differenceInDays(e, windowStart) / WIN_DAYS * 100)
    const width = Math.max(0.5, rightPct - leftPct)
    return { left: `${leftPct}%`, width: `${width}%`, background: STATUS_BAR_COLORS[task.status] }
  }

  const userTasks = selectedUser ? tasks.filter(t => t.assignee_id === selectedUser.id && t.start_date && t.due_date) : []

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-5">Ekip Durumu</h1>
      <div className="grid grid-cols-2 gap-4">
        {users.map(member => {
          const memberTasks = tasks.filter(t => t.assignee_id === member.id)
          const done  = memberTasks.filter(t => t.status === 'done').length
          const doing = memberTasks.filter(t => t.status === 'doing').length
          const todo  = memberTasks.filter(t => t.status === 'todo').length
          const pct   = memberTasks.length ? Math.round(done / memberTasks.length * 100) : 0
          return (
            <div key={member.id}
              className={`bg-white border border-gray-200 rounded-2xl p-5 ${canViewProfile ? 'cursor-pointer hover:border-teal-300 transition-colors' : ''}`}
              onClick={() => canViewProfile && setSelectedUser(member)}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: member.avatar_color, color: '#1f2937' }}>
                  {getInitials(member.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-400">{member.email}</p>
                </div>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  member.role === 'manager' ? 'bg-teal-50 text-teal-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {member.role === 'manager' ? 'Yönetici' : 'Çalışan'}
                </span>
              </div>
              <div className="space-y-1.5 mb-3">
                {[
                  { label: 'Bekliyor', value: todo, color: 'text-gray-600' },
                  { label: 'Devam Ediyor', value: doing, color: 'text-amber-600' },
                  { label: 'Tamamlandı', value: done, color: 'text-teal-600' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between text-xs">
                    <span className="text-gray-400">{s.label}</span>
                    <span className={`font-semibold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                <div className="h-full bg-teal-400 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-gray-400">%{pct} tamamlanma — {memberTasks.length} görev</p>
              {canViewProfile && <p className="text-[10px] text-teal-500 mt-2">Takvimi gör →</p>}
            </div>
          )
        })}
      </div>

      {/* Kisi Takvim Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedUser(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center gap-3 p-5 pb-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: selectedUser.avatar_color, color: '#1f2937' }}>
                {getInitials(selectedUser.name)}
              </div>
              <div className="flex-1">
                <h2 className="text-[17px] font-semibold text-gray-900">{selectedUser.name}</h2>
                <p className="text-xs text-gray-400">{userTasks.length} görev</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setWindowStart(d => subDays(d, 7))} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">← Geri</button>
                <button onClick={() => setWindowStart(subDays(new Date(), 4))} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Bugün</button>
                <button onClick={() => setWindowStart(d => addDays(d, 7))} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">İleri →</button>
                <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 ml-2"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="min-w-[600px]">
                {/* Gün başlıkları */}
                <div className="flex border-b border-gray-100 mb-1">
                  <div className="w-48 flex-shrink-0 px-3 py-2 text-xs font-medium text-gray-400">Görev</div>
                  <div className="flex-1 flex">
                    {days.map((d, i) => (
                      <div key={i} className={`flex-1 text-center py-2 text-[9px] font-medium ${isToday(d) ? 'text-red-500 bg-red-50' : 'text-gray-400'}`}>
                        {format(d, 'd', { locale: tr })}<br/><span className="opacity-60">{format(d, 'MMM', { locale: tr })}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {userTasks.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">Takvimde gösterilecek görev yok.</div>
                )}

                {userTasks.map(task => {
                  const bar = barStyle(task)
                  return (
                    <div key={task.id} className="flex border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <div className="w-48 flex-shrink-0 px-3 py-3 border-r border-gray-100">
                        <p className="text-xs font-medium text-gray-800 truncate">{task.title}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          task.status === 'done' ? 'bg-teal-50 text-teal-600' :
                          task.status === 'doing' ? 'bg-amber-50 text-amber-600' :
                          task.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {task.status === 'done' ? 'Tamamlandı' : task.status === 'doing' ? 'Devam' : task.status === 'cancelled' ? 'İptal' : 'Bekliyor'}
                        </span>
                      </div>
                      <div className="flex-1 relative" style={{ height: 44 }}>
                        {todayPct >= 0 && todayPct <= 100 && (
                          <div className="absolute top-0 bottom-0 w-px bg-red-400 opacity-40 z-10" style={{ left: `${todayPct}%` }} />
                        )}
                        {bar && <div className="absolute top-3 h-4 rounded-full opacity-80" style={bar} />}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-5 mt-3 text-xs text-gray-400">
                {[['#D1D5DB','Bekliyor'],['#FBBF24','Devam Ediyor'],['#34D399','Tamamlandı'],['#FCA5A5','İptal']].map(([c,l]) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-full inline-block" style={{ background: c }} />{l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}