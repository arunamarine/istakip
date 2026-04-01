'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { KeyRound, Loader2, CheckCircle } from 'lucide-react'

export default function ProfilePage() {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPass.length < 6) { setError('Şifre en az 6 karakter olmalı.'); return }
    if (newPass !== confirm) { setError('Şifreler eşleşmiyor.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setLoading(false)
    if (error) { setError('Şifre değiştirilemedi: ' + error.message); return }
    setSuccess(true)
    setCurrent(''); setNewPass(''); setConfirm('')
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold text-gray-900 mb-5">Şifre Değiştir</h1>
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        {success && (
          <div className="flex items-center gap-2 text-teal-600 bg-teal-50 rounded-xl px-4 py-3 mb-4">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Şifreniz başarıyla değiştirildi!</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Yeni Şifre</label>
            <input
              type="password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400"
              placeholder="En az 6 karakter"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Yeni Şifre Tekrar</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400"
              placeholder="Şifreyi tekrar girin"
              required
            />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-teal-400 hover:bg-teal-600 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
          </button>
        </form>
      </div>
    </div>
  )
}