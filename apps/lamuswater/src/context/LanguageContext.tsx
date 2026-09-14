import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, LOCALE_MAP, SERVER_MESSAGE_KEYS, type Lang } from '../i18n/translations'
import { formatDate, type DateFormatOpts } from '../i18n/dateFormat'

export type { Lang }

interface LanguageContextType {
  lang: Lang
  setLang: (l: Lang) => void
  locale: string
  t: (key: string, vars?: Record<string, string | number>) => string
  tServer: (message?: string) => string
  tError: (error: any, url?: string) => string
  fmtDate: (date: Date | string, opts: DateFormatOpts) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

const interpolate = (str: string, vars?: Record<string, string | number>) => {
  if (!vars) return str
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)), str)
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('lamussa_lang')
    return (stored === 'en' || stored === 'ru' || stored === 'uz') ? stored : 'en'
  })

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lamussa_lang', l)
  }

  const t = (key: string, vars?: Record<string, string | number>) => {
    const raw = translations[lang][key] ?? translations.en[key] ?? key
    return interpolate(raw, vars)
  }

  const tServer = (message?: string) => {
    if (!message) return t('common.error')
    const key = SERVER_MESSAGE_KEYS[message]
    return key ? t(key) : message
  }

  // Distinguishes "server responded with an error" (show its message) from
  // "the request never reached the server" (show which address failed and
  // why, instead of axios's opaque "Network Error") — see AGENTS.md.
  const tError = (error: any, url?: string): string => {
    if (error?.response) return tServer(error.response.data?.message)
    if (error?.request) return url ? t('common.networkError', { url }) : t('common.error')
    return error?.message || t('common.error')
  }

  const fmtDate = (date: Date | string, opts: DateFormatOpts) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return formatDate(d, lang, LOCALE_MAP[lang], opts)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, locale: LOCALE_MAP[lang], t, tServer, tError, fmtDate }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
