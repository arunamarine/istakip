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
```

Kaydedin. Şimdi görev atandığında Telegram mesajı gönderelim. AddTaskModal'ı güncelleyelim:
```
notepad "src\components\tasks\AddTaskModal.tsx"
```

`handleSubmit` fonksiyonunda şu kısmı bulun:
```
    if (selectedUsers.length > 0) {
      await supabase.from('task_assignees').insert(
        selectedUsers.map(uid => ({ task_id: task.id, user_id: uid }))
      )
    }

    setLoading(false)
    onAdd()
    onClose()
```

Şu şekilde değiştirin:
```
    if (selectedUsers.length > 0) {
      await supabase.from('task_assignees').insert(
        selectedUsers.map(uid => ({ task_id: task.id, user_id: uid }))
      )

      // Telegram bildirimi gönder
      for (const uid of selectedUsers) {
        if (uid !== currentUserId) {
          await fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: uid,
              message: `📋 <b>Yeni Görev Atandı</b>\n\n<b>${form.title}</b>\n\nGörev size atandı. Detaylar için uygulamayı açın:\nhttps://istakip-sigma.vercel.app`,
            }),
          })
        }
      }
    }

    setLoading(false)
    onAdd()
    onClose()
