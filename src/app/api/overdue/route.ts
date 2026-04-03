import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assignee:users!tasks_assignee_id_fkey(id, name, telegram_id)')
    .lt('due_date', today)
    .not('status', 'in', '("done","cancelled")')

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ message: 'Gecikmiş görev yok' })
  }

  const results = []
  for (const task of tasks) {
    const assignee = task.assignee
    if (!assignee?.telegram_id) continue

    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: assignee.telegram_id,
        text: `⚠️ <b>Gecikmiş Görev</b>\n\n📋 ${task.title}\n\nSon tarih: ${task.due_date} geçti!\n\n🔗 <a href="https://istakip-sigma.vercel.app">Uygulamayı Aç</a>`,
        parse_mode: 'HTML',
      }),
    })
    const data = await res.json()
    results.push({ task: task.title, result: data.ok })
  }

  return NextResponse.json({ sent: results.length, results })
}