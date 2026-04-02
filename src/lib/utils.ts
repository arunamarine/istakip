import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  return format(parseISO(date), 'd MMM yyyy', { locale: tr })
}

export function isDueNear(due: string | null): boolean {
  if (!due) return false
  const diff = differenceInDays(parseISO(due), new Date())
  return diff >= 0 && diff <= 3
}

export function isDueOver(due: string | null): boolean {
  if (!due) return false
  return differenceInDays(parseISO(due), new Date()) < 0
}

export function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export const AVATAR_COLORS = [
  { bg: '#1D9E75', text: '#ffffff' },
  { bg: '#534AB7', text: '#ffffff' },
  { bg: '#185FA5', text: '#ffffff' },
  { bg: '#D85A30', text: '#ffffff' },
  { bg: '#BA7517', text: '#ffffff' },
  { bg: '#3B6D11', text: '#ffffff' },
  { bg: '#993556', text: '#ffffff' },
]

export function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Düşük', mid: 'Orta', high: 'Yüksek'
}

export const STATUS_LABELS: Record<string, string> = {
  todo: 'Bekliyor', doing: 'Devam Ediyor', done: 'Tamamlandı', cancelled: 'İptal Edildi'
}
