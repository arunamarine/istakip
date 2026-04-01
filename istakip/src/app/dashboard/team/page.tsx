import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getInitials } from '@/lib/utils'

export default async function TeamPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (profile?.role !== 'manager') redirect('/dashboard/kanban')

  const { data: users } = await supabase.from('users').select('*').order('name')
  const { data: tasks } = await supabase.from('tasks').select('*')

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-5">Ekip Durumu</h1>

      <div className="grid grid-cols-2 gap-4">
        {(users ?? []).map((member, idx) => {
          const memberTasks = (tasks ?? []).filter(t => t.assignee_id === member.id)
          const done  = memberTasks.filter(t => t.status === 'done').length
          const doing = memberTasks.filter(t => t.status === 'doing').length
          const todo  = memberTasks.filter(t => t.status === 'todo').length
          const pct   = memberTasks.length ? Math.round(done / memberTasks.length * 100) : 0

          return (
            <div key={member.id} className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                  style={{ background: member.avatar_color, color: '#0F6E56' }}
                >
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
                <div className="h-full bg-teal-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-gray-400">%{pct} tamamlanma — {memberTasks.length} görev</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
