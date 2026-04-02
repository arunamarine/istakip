'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { addDays, subDays, format, differenceInDays, parseISO, isToday } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import type { Task, User } from '@/types'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import AddTaskModal from '@/components/tasks/AddTaskModal'
import StatsBar from '@/components/ui/StatsBar'
import { getInitials, STATUS_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'

const WIN_DAYS = 28
const STATUS_BAR_COLORS: Record<string, string> = {
  todo:  '#D1D5DB',
  doing: '#FBBF24',
  done:  '#34D399',
}

export default function GanttPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [windowStart, setWindowStart] = useState(() => subDays(new Date(), 4))
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: profile }, { data: allUsers }, { data: allTasks }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('users').select('*').order('name'),
      supabase.from('tasks').select('*, assignee:users!tasks_assignee_id_fkey(*)').order('start_date', { ascending: true }),
    ])
    if (profile) setCurrentUser(profile)
    if (allUsers) setUsers(allUsers)
    if (allTasks) {
      const visible = profile?.role === 'manager'
        ? allTasks.filter((t: Task) => t.start_date && t.due_date)
        : allTasks.filter((t: Task) => (t.assignee_id === user.id || t.created_by === user.id) && t.start_date && t.due_date)
      setTasks(visible)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const days = Array.from({ length: WIN_DAYS }, (_, i) => addDays(windowStart, i))
  const totalMs = WIN_DAYS * 86400000

  function barStyle(task: Task) {
    if (!task.start_date || !task.due_date) return null
    const s = parseISO(task.start_date)
    const e = addDays(parseISO(task.due_date), 1)
    const leftPct  = Math.max(0, differenceInDays(s, windowStart) / WIN_DAYS * 100)
    const rightPct = Math.min(100, differenceInDays(e, windowStart) / WIN_DAYS * 100)
    const width = Math.max(0.5, rightPct - leftPct)
    return { left: `${leftPct}%`, width: `${width}%`, background: STATUS_BAR_COLORS[task.status] }
  }

  const todayPct = differenceInDays(new Date(), windowStart) / WIN_DAYS * 100

  if (!currentUser) return <div className="flex items-center justify-center h-40 text-gray-400">Yükleniyor...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-gray-900">Takvim (Gantt)</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWindowStart(d => subDays(d, 7))}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">← Geri</button>
          <button onClick={() => setWindowStart(subDays(new Date(), 4))}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Bugün</button>
          <button onClick={() => setWindowStart(d => addDays(d, 7))}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">İleri →</button>
         <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-400 hover:bg-teal-600 text-white text-sm font-medium rounded-xl transition-colors ml-2">
          <Plus className="w-4 h-4" /> Görev Ekle
        </button>
        </div>
      </div>

      <StatsBar tasks={tasks} />

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Day headers */}
        <div className="flex border-b border-gray-100">
          <div className="w-64 flex-shrink-0 px-4 py-2.5 border-r border-gray-100">
            <span className="text-xs font-medium text-gray-400">Görev</span>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <div className="flex">
              {days.map((d, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex-1 text-center py-2.5 text-[10px] font-medium border-r border-gray-50 last:border-0',
                    isToday(d) ? 'text-red-500 bg-red-50' : 'text-gray-400'
                  )}
                >
                  {format(d, 'd', { locale: tr })}
                  <br />
                  <span className="opacity-60">{format(d, 'MMM', { locale: tr })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rows */}
        {tasks.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            Tarih aralığı belirtilmiş görev bulunamadı.
          </div>
        )}
        {tasks.map(task => {
          const bar = barStyle(task)
          const assignee = users.find(u => u.id === task.assignee_id)
          return (
            <div
              key={task.id}
              className="flex border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelectedTask(task)}
            >
              {/* Task info */}
              <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-100 flex items-center gap-2">
                {assignee && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0"
                    style={{ background: assignee.avatar_color, color: '#0F6E56' }}>
                    {getInitials(assignee.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{task.title}</p>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    task.status === 'done'  ? 'bg-teal-50 text-teal-600' :
                    task.status === 'doing' ? 'bg-amber-50 text-amber-600' :
                                              'bg-gray-100 text-gray-500'
                  )}>
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>
              </div>

              {/* Bar area */}
              <div className="flex-1 relative" style={{ height: 44 }}>
                {/* Today line */}
                {todayPct >= 0 && todayPct <= 100 && (
                  <div className="absolute top-0 bottom-0 w-px bg-red-400 opacity-40 z-10"
                    style={{ left: `${todayPct}%` }} />
                )}
                {/* Bar */}
                {bar && (
                  <div
                    className="absolute top-3 h-4 rounded-full opacity-80"
                    style={bar}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 text-xs text-gray-400">
        {[['#D1D5DB','Bekliyor'],['#FBBF24','Devam Ediyor'],['#34D399','Tamamlandı']].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-full inline-block" style={{ background: c }} />{l}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-px h-3 bg-red-400 inline-block" /> Bugün
        </span>
      </div>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} currentUser={currentUser} users={users}
          onClose={() => setSelectedTask(null)} onUpdate={() => { load(); setSelectedTask(null) }} />
      )}
      {showAdd && (
        <AddTaskModal currentUserId={currentUser.id} users={users}
          onClose={() => setShowAdd(false)} onAdd={load} />
      )}
    </div>
  )
}
