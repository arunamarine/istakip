'use client'
import { cn, isDueNear, isDueOver, getInitials, PRIORITY_LABELS } from '@/lib/utils'
import { MessageSquare, Calendar } from 'lucide-react'
import type { Task } from '@/types'

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-700',
  mid:  'bg-amber-50 text-amber-700',
  low:  'bg-green-50 text-green-700',
}

interface Props {
  task: Task
  onClick: () => void
  dragging?: boolean
}

export default function TaskCard({ task, onClick, dragging }: Props) {
  const near = isDueNear(task.due_date)
  const over = isDueOver(task.due_date) && task.status !== 'done'

  const assignees = task.task_assignees && task.task_assignees.length > 0
    ? task.task_assignees.filter((ta: any) => ta.user).map((ta: any) => ta.user)
    : task.assignee ? [task.assignee] : []

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border border-gray-200 rounded-xl p-3.5 cursor-pointer select-none',
        'hover:border-teal-300 hover:shadow-sm transition-all',
        task.status === 'todo' && 'border-l-4 border-l-red-300',
        task.status === 'doing' && 'border-l-4 border-l-amber-400',
        task.status === 'done' && 'border-l-4 border-l-teal-400',
        dragging && 'opacity-40 shadow-lg'
      )}
    >
      <p className="text-sm font-medium text-gray-900 mb-2.5 leading-snug">{task.title}</p>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', PRIORITY_STYLES[task.priority])}>
          {PRIORITY_LABELS[task.priority]}
        </span>

        {task.due_date && (
          <span className={cn(
            'text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1',
            over  ? 'bg-red-50 text-red-600 font-medium' :
            near  ? 'bg-amber-50 text-amber-600 font-medium' :
                    'bg-gray-100 text-gray-500'
          )}>
            <Calendar className="w-2.5 h-2.5" />
            {over ? 'Gecikti' : task.due_date}
          </span>
        )}

        {task.comments && task.comments.length > 0 && (
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {task.comments.length}
          </span>
        )}

        <div className="flex ml-auto gap-1">
          {assignees.map((a: any) => (
            <div key={a.id}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium"
              style={{ background: a.avatar_color, color: '#0F6E56' }}
              title={a.name}>
              {getInitials(a.name)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}