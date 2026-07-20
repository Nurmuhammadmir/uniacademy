import React, { createContext, useContext, useState } from 'react'
import { TRANSLATIONS, LANGUAGE_LABELS } from './translations.js'

const STORAGE_KEY = 'uniacademy_parent_lang'

const LanguageContext = createContext()

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en')

  const setLang = (code) => {
    setLangState(code)
    localStorage.setItem(STORAGE_KEY, code)
  }

  const t = (key, vars) => {
    let str = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key
    if (vars) Object.entries(vars).forEach(([k, v]) => { str = str.replaceAll(`{${k}}`, v) })
    return str
  }

  const value = {
    lang, setLang, t,
    availableLanguages: Object.keys(TRANSLATIONS).map(code => ({ code, label: LANGUAGE_LABELS[code] })),
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
