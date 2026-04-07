'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, CalendarDays, Users, Bell, KeyRound, ClipboardList } from 'lucide-react'
import type { Role } from '@/types'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const navItems = (role: Role) => [
  { href: '/dashboard/kanban',        label: 'Kanban',         icon: LayoutGrid },
  { href: '/dashboard/gantt',         label: 'Takvim',         icon: CalendarDays },
  ...(role === 'manager' ? [{ href: '/dashboard/team', label: 'Ekip', icon: Users }] : []),
  { href: '/dashboard/notifications', label: 'Bildirimler',    icon: Bell },
  { href: '/dashboard/requests',      label: 'İstekler',       icon: ClipboardList },
  { href: '/dashboard/profile',       label: 'Şifre Değiştir', icon: KeyRound },
]

export default function Sidebar({ role, userId }: { role: Role; userId: string }) {
  const pathname = usePathname()
  const items = navItems(role)
  const [pendingCount, setPendingCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    loadPending()
    const channel = supabase.channel('sidebar-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_requests' }, loadPending)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function loadPending() {
    const query = role === 'manager'
      ? supabase.from('task_requests').select('id', { count: 'exact', head: true }).eq('manager_id', userId).eq('status', 'pending')
      : supabase.from('task_requests').select('id', { count: 'exact', head: true }).eq('requester_id', userId).eq('status', 'pending')
    const { count } = await query
    setPendingCount(count ?? 0)
  }

  return (
    <>
      <aside className="hidden lg:flex w-52 bg-white border-r border-gray-200 flex-shrink-0 py-4 flex-col">
        <nav className="space-y-0.5 px-2">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            const isRequests = href === '/dashboard/requests'
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-teal-50 text-teal-600 font-medium border-l-2 border-teal-400'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                )}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {isRequests && pendingCount > 0 && (
                  <span className="ml-auto bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          const isRequests = href === '/dashboard/requests'
          return (
            <Link key={href} href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors relative',
                active ? 'text-teal-600' : 'text-gray-400'
              )}>
              <Icon className={cn('w-5 h-5', active && 'stroke-teal-600')} />
              {isRequests && pendingCount > 0 && (
                <span className="absolute top-1 right-1/4 bg-amber-400 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}