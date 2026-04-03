'use client'
import { useState, useEffect, useCallback } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase'
import { Plus } from 'lucide-react'
import type { Task, User, TaskStatus } from '@/types'
import TaskCard from '@/components/tasks/TaskCard'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import AddTaskModal from '@/components/tasks/AddTaskModal'
import StatsBar from '@/components/ui/StatsBar'

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: 'todo',      label: 'Bekliyor',      color: 'bg-gray-100 text-gray-600',   bg: 'bg-gray-50' },
  { id: 'doing',     label: 'Devam Ediyor',  color: 'bg-amber-100 text-amber-700', bg: 'bg-amber-50/30' },
  { id: 'done',      label: 'Tamamlandı',    color: 'bg-teal-100 text-teal-700',   bg: 'bg-teal-50/30' },
  { id: 'cancelled', label: 'İptal Edildi',  color: 'bg-red-100 text-red-600',     bg: 'bg-red-50/30' },
]

function SortableCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} dragging={isDragging} />
    </div>
  )
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const supabase = createClient()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: profile }, { data: allUsers }, { data: allTasks }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('users').select('*').order('name'),
      supabase.from('tasks').select('*, assignee:users!tasks_assignee_id_fkey(*), comments(id), task_assignees(user_id, user:users(id,name,avatar_color))').order('created_at', { ascending: false }),
    ])
    if (profile) setCurrentUser(profile)
    if (allUsers) setUsers(allUsers)
    if (allTasks) {
      const visible = profile?.role === 'manager'
        ? allTasks
        : allTasks.filter((t: Task) => t.assignee_id === user.id || t.created_by === user.id)
      setTasks(visible)
    }
  }, [])

  useEffect(() => {
    load()
    const channel = supabase.channel('tasks-kanban')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return
    const taskId = active.id as string
    const overId = over.id as string

    // Sütun ID'si mi yoksa kart ID'si mi kontrol et
    let newStatus = COLUMNS.find(c => c.id === overId)?.id
    if (!newStatus) {
      // Kart üzerine bırakıldıysa o kartın durumunu al
      const overTask = tasks.find(t => t.id === overId)
      if (overTask) newStatus = overTask.status
    }

    if (newStatus && newStatus !== tasks.find(t => t.id === taskId)?.status) {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus! } : t))
    }
  }

  const colTasks = (col: TaskStatus) => tasks.filter(t => t.status === col)

  if (!currentUser) return <div className="flex items-center justify-center h-40 text-gray-400">Yükleniyor...</div>

  return (
    <DndContext sensors={sensors} onDragStart={e => setActiveTask(tasks.find(t => t.id === e.active.id) ?? null)} onDragEnd={handleDragEnd}>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-gray-900">Kanban Board</h1>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-400 hover:bg-teal-600 text-white text-sm font-medium rounded-xl transition-colors ml-2">
          <Plus className="w-4 h-4" /> Görev Ekle
        </button>
      </div>

      <StatsBar tasks={tasks} />

      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(col => (
          <div key={col.id} id={col.id} className={`${col.bg} border border-gray-200 rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${col.color}`}>{col.label}</span>
              <span className="text-xs text-gray-400 font-medium">{colTasks(col.id).length}</span>
            </div>
            <SortableContext items={colTasks(col.id).map(t => t.id)} strategy={verticalListSortingStrategy} id={col.id}>
              <div className="space-y-2 min-h-[80px]">
                {colTasks(col.id).length === 0 && (
                  <p className="text-xs text-gray-300 text-center py-6">Görev yok</p>
                )}
                {colTasks(col.id).map(task => (
                  <SortableCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
      </DragOverlay>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          currentUser={currentUser}
          users={users}
          onClose={() => setSelectedTask(null)}
          onUpdate={async () => { await load(); setSelectedTask(null) }}
        />
      )}
      {showAdd && (
        <AddTaskModal
          currentUserId={currentUser.id}
          users={users}
          onClose={() => setShowAdd(false)}
          onAdd={load}
        />
      )}
    </DndContext>
  )
}
