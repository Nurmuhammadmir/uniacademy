import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { TRANSLATIONS, LANGUAGE_LABELS } from './translations.js'

const STORAGE_KEY = 'uniacademy_student_lang'
const ALL_CODES = Object.keys(TRANSLATIONS)

const LanguageContext = createContext()

// `enabledLanguages` (passed down from Settings.enabledStudentLanguages, director-controlled) -
// if the student's saved choice gets disabled, silently fall back to English rather than error
export const LanguageProvider = ({ enabledLanguages, children }) => {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en')

  const availableCodes = useMemo(() => {
    const allowed = Array.isArray(enabledLanguages) && enabledLanguages.length ? enabledLanguages : ALL_CODES
    return ALL_CODES.filter(c => allowed.includes(c))
  }, [enabledLanguages])

  useEffect(() => {
    if (availableCodes.length && !availableCodes.includes(lang)) setLangState('en')
  }, [availableCodes])

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
    availableLanguages: availableCodes.map(code => ({ code, label: LANGUAGE_LABELS[code] })),
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
