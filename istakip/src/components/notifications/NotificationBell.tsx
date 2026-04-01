'use client'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Notification } from '@/types'
import { useRouter } from 'next/navigation'

export default function NotificationBell({ userId }: { userId: string }) {
  const [unread, setUnread] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // İlk yükleme
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .then(({ count }) => setUnread(count ?? 0))

    // Gerçek zamanlı güncelleme
    const channel = supabase
      .channel('notifs-bell')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false)
          .then(({ count }) => setUnread(count ?? 0))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return (
    <button
      onClick={() => router.push('/dashboard/notifications')}
      className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
    >
      <Bell className="w-4 h-4" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </button>
  )
}
