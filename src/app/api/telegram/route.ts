import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { user_id, message } = await req.json()
  const supabase = createServerSupabase()

  const { data: user } = await supabase
    .from('users')
    .select('telegram_id, name')
    .eq('id', user_id)
    .single()

  if (!user?.telegram_id) {
    return NextResponse.json({ error: 'Telegram ID bulunamadı' }, { status: 404 })
  }

  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: user.telegram_id,
      text: message,
      parse_mode: 'HTML',
    }),
  })

  const data = await res.json()
  return NextResponse.json(data)
}