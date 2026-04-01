'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Bell, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifs(data)
  }, [])

  useEffect(() => {
    load()
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const channel = supabase.channel('notifs-page')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => load())
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
    setup()
  }, [load])

  async function markAllRead() {
    if (!userId) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const unread = notifs.filter(n => !n.is_read).length

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bildirimler</h1>
          {unread > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">{unread} okunmamış bildirim</p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 border border-teal-200 hover:border-teal-400 px-3 py-1.5 rounded-xl transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Tümünü okundu işaretle
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {notifs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <Bell className="w-10 h-10 mb-3" />
            <p className="text-sm">Bildiriminiz bulunmuyor</p>
          </div>
        )}
        {notifs.map((n, i) => (
          <div
            key={n.id}
            onClick={() => !n.is_read && markRead(n.id)}
            className={cn(
              'flex items-start gap-4 px-5 py-4 border-b border-gray-50 last:border-0 transition-colors',
              !n.is_read ? 'bg-teal-50/40 cursor-pointer hover:bg-teal-50' : 'hover:bg-gray-50'
            )}
          >
            <div className={cn(
              'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
              !n.is_read ? 'bg-teal-400' : 'bg-gray-200'
            )} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm', !n.is_read ? 'font-medium text-gray-900' : 'text-gray-600')}>
                {n.title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{n.body}</p>
              <p className="text-[11px] text-gray-300 mt-1">
                {new Date(n.created_at).toLocaleString('tr-TR', {
                  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
