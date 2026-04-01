import type { Task } from '@/types'

export default function StatsBar({ tasks }: { tasks: Task[] }) {
  const todo  = tasks.filter(t => t.status === 'todo').length
  const doing = tasks.filter(t => t.status === 'doing').length
  const done  = tasks.filter(t => t.status === 'done').length

  const stats = [
    { label: 'Toplam', value: tasks.length, color: 'text-gray-900' },
    { label: 'Bekliyor', value: todo, color: 'text-gray-500' },
    { label: 'Devam Ediyor', value: doing, color: 'text-amber-600' },
    { label: 'Tamamlandı', value: done, color: 'text-teal-600' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {stats.map(s => (
        <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3.5">
          <p className="text-xs text-gray-500 mb-1">{s.label}</p>
          <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  )
}
