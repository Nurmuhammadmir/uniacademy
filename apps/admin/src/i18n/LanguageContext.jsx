import React, { createContext, useContext, useState } from 'react'
import { TRANSLATIONS, LANGUAGE_LABELS } from './translations.js'

const STORAGE_KEY = 'uniacademy_admin_lang'

const LanguageContext = createContext()

// module-level mirror of the active language, kept in sync by the Provider below - lets
// AdminContextProvider (which sits OUTSIDE LanguageProvider in main.jsx) translate its toast/
// confirm messages via the standalone t() export without needing the useLanguage() hook
let currentLang = localStorage.getItem(STORAGE_KEY) || 'uz'

export const t = (key, vars) => {
  let str = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en[key] ?? key
  if (vars) Object.entries(vars).forEach(([k, v]) => { str = str.replaceAll(`{${k}}`, v) })
  return str
}

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => currentLang)

  const setLang = (code) => {
    setLangState(code)
    currentLang = code
    localStorage.setItem(STORAGE_KEY, code)
  }

  const value = {
    lang, setLang, t,
    availableLanguages: Object.keys(TRANSLATIONS).map(code => ({ code, label: LANGUAGE_LABELS[code] })),
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
