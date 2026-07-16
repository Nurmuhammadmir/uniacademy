import React, { createContext, useContext, useState } from 'react'
import { TRANSLATIONS, LANGUAGE_LABELS } from './translations.js'

const STORAGE_KEY = 'uniacademy_director_lang'

// module-level mirror of the current language, kept in sync by the provider below - lets plain
// JS files (like DirectorContext.jsx, which fires toast messages from outside any component) look
// up a translation via the standalone `t` export without needing a hook
let currentLang = localStorage.getItem(STORAGE_KEY) || 'en'

export const t = (key, vars) => {
  let str = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en[key] ?? key
  if (vars) Object.entries(vars).forEach(([k, v]) => { str = str.replaceAll(`{${k}}`, v) })
  return str
}

const LanguageContext = createContext()

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(currentLang)

  const setLang = (code) => {
    currentLang = code
    setLangState(code)
    localStorage.setItem(STORAGE_KEY, code)
  }

  const value = {
    lang, setLang, t,
    availableLanguages: Object.keys(TRANSLATIONS).map(code => ({ code, label: LANGUAGE_LABELS[code] })),
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
