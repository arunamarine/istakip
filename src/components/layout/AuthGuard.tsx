'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from './Header'
import Sidebar from './Sidebar'
import type { User } from '@/types'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('users').select('*').eq('id', session.user.id).single()
      if (!profile) { router.push('/login'); return }
      setUser(profile)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400">
      Yükleniyor...
    </div>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header user={user!} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={user!.role} userId={user!.id} />
        <main className="flex-1 overflow-y-auto bg-stone-50 p-3 md:p-5 pb-20 md:pb-5">{children}</main>
      </div>
    </div>
  )
}