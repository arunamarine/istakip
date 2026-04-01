import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header user={profile} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={profile.role} />
        <main className="flex-1 overflow-y-auto bg-stone-50 p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
