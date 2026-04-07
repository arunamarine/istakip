'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, CalendarDays, Users, Bell, KeyRound, ClipboardList } from 'lucide-react'
import type { Role } from '@/types'
import { cn } from '@/lib/utils'

const navItems = (role: Role) => [
  { href: '/dashboard/kanban',        label: 'Kanban',         icon: LayoutGrid },
  { href: '/dashboard/gantt',         label: 'Takvim',         icon: CalendarDays },
  ...(role === 'manager' ? [{ href: '/dashboard/team', label: 'Ekip', icon: Users }] : []),
  { href: '/dashboard/notifications', label: 'Bildirimler',    icon: Bell },
{ href: '/dashboard/requests',      label: 'İstekler',        icon: ClipboardList },  
{ href: '/dashboard/profile',       label: 'Şifre Değiştir', icon: KeyRound },
]

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = navItems(role)

  return (
    <>
      <aside className="hidden lg:flex w-52 bg-white border-r border-gray-200 flex-shrink-0 py-4 flex-col">
        <nav className="space-y-0.5 px-2">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
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
              </Link>
            )
          })}
        </nav>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors',
                active ? 'text-teal-600' : 'text-gray-400'
              )}>
              <Icon className={cn('w-5 h-5', active && 'stroke-teal-600')} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}