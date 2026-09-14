import type { Lang } from './translations'

// Browsers' built-in Intl date formatting is unreliable for 'uz-UZ' — many
// (Chromium included) lack real Uzbek CLDR data and silently fall back to
// English weekday/month names or a garbled pattern like "2026 M08 11, Tue".
// en-US and ru-RU are fully supported everywhere, so those still go through
// the native formatter; Uzbek gets its own name tables so it's always
// correct regardless of what locale data the visitor's browser ships.

// Date.getDay(): 0 = Sunday
const WEEKDAY_SHORT_UZ = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan']
const WEEKDAY_LONG_UZ = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']
const MONTH_SHORT_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']
const MONTH_LONG_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']

export interface DateFormatOpts {
  weekday?: 'short' | 'long'
  month?: 'short' | 'long'
  day?: 'numeric'
  year?: 'numeric'
  hour?: '2-digit'
  minute?: '2-digit'
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const formatUz = (date: Date, opts: DateFormatOpts): string => {
  const parts: string[] = []
  if (opts.weekday) parts.push(opts.weekday === 'long' ? WEEKDAY_LONG_UZ[date.getDay()] : WEEKDAY_SHORT_UZ[date.getDay()])

  const dateParts: string[] = []
  if (opts.day) dateParts.push(String(date.getDate()))
  if (opts.month) dateParts.push(opts.month === 'long' ? MONTH_LONG_UZ[date.getMonth()] : MONTH_SHORT_UZ[date.getMonth()])
  if (opts.year) dateParts.push(String(date.getFullYear()))
  if (dateParts.length) parts.push(dateParts.join(' '))

  if (opts.hour && opts.minute) parts.push(`${pad2(date.getHours())}:${pad2(date.getMinutes())}`)

  return parts.join(', ')
}

export const formatDate = (date: Date, lang: Lang, locale: string, opts: DateFormatOpts): string => {
  if (lang === 'uz') return formatUz(date, opts)
  return date.toLocaleString(locale, opts as Intl.DateTimeFormatOptions)
}
