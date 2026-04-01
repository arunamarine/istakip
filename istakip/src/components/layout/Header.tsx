'use client'
import { CheckSquare, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getInitials } from '@/lib/utils'
import NotificationBell from '@/components/notifications/NotificationBell'
import type { User } from '@/types'

export default function Header({ user }: { user: User }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center px-5 gap-4 flex-shrink-0 z-10">
      <div className="flex items-center gap-2.5 flex-1">
        <div className="w-7 h-7 bg-teal-400 rounded-lg flex items-center justify-center">
          <CheckSquare className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-[15px]">İş Takip</span>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell userId={user.id} />

        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
            style={{ background: user.avatar_color, color: '#0F6E56' }}
          >
            {getInitials(user.name)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-none">{user.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {user.role === 'manager' ? 'Yönetici' : 'Çalışan'}
            </p>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            user.role === 'manager'
              ? 'bg-teal-50 text-teal-600'
              : 'bg-blue-50 text-blue-600'
          }`}>
            {user.role === 'manager' ? 'Yönetici' : 'Çalışan'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Çıkış"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
