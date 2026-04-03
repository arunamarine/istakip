import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: users } = await supabase
    .from('users')
    .select('id, name, telegram_id, assignee_id:id')
    .not('telegram_id', 'is', null)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assignee:users!tasks_assignee_id_fkey(id, name)')
    .not('status', 'in', '("cancelled")')

  if (!users || !tasks) return NextResponse.json({ error: 'Veri alınamadı' }, { status: 500 })

  const today = new Date().toISOString().split('T')[0]
  const todo    = tasks.filter(t => t.status === 'todo').length
  const doing   = tasks.filter(t => t.status === 'doing').length
  const done    = tasks.filter(t => t.status === 'done').length
  const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done').length

  const results = []
  for (const user of users) {
    if (!user.telegram_id) continue
    const myTasks = tasks.filter(t => t.assignee_id === user.id && t.status !== 'done')
    let myTasksText = ''
    if (myTasks.length > 0) {
      myTasksText = '\n\n📌 <b>Sizin görevleriniz:</b>\n' +
        myTasks.map(t => `• ${t.title} (${t.status === 'todo' ? '⏳ Bekliyor' : '🔵 Devam Ediyor'})`).join('\n')
    }
    const message = `📊 <b>Haftalık Görev Özeti</b>\n\n` +
      `⏳ Bekliyor: ${todo}\n` +
      `🔵 Devam Ediyor: ${doing}\n` +
      `✅ Tamamlandı: ${done}\n` +
      `⚠️ Gecikmiş: ${overdue}` +
      myTasksText +
      `\n\n🔗 <a href="https://istakip-sigma.vercel.app">Uygulamayı Aç</a>`
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: user.telegram_id, text: message, parse_mode: 'HTML' }),
    })
    const data = await res.json()
    results.push({ user: user.name, ok: data.ok })
  }

  return NextResponse.json({ sent: results.length, results })
}