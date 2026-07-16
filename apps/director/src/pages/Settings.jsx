import React, { useContext } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import FontSizeControl from '../components/FontSizeControl.jsx'
import InstallAppCard from '../components/InstallAppCard.jsx'

const STUDENT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'uz', label: "Uzbek (O'zbekcha)" },
  { code: 'kaa', label: 'Karakalpak (Qaraqalpaqsha)' },
]

const Settings = () => {
  const { settings, updateSettings } = useContext(DirectorContext)
  const { t, lang, setLang, availableLanguages } = useLanguage()

  if (!settings) return <p className='text-muted'>{t('loading')}</p>

  const enabledLanguages = settings.enabledStudentLanguages || ['en', 'ru', 'uz', 'kaa']

  const toggleLanguage = (code) => {
    const isEnabled = enabledLanguages.includes(code)
    // never allow turning off the last remaining language - a student always needs at least one
    if (isEnabled && enabledLanguages.length === 1) return
    const next = isEnabled ? enabledLanguages.filter(c => c !== code) : [...enabledLanguages, code]
    updateSettings({ enabledStudentLanguages: next })
  }

  return (
    <div>
      <p className='font-display text-2xl text-ink mb-6'>{t('settingsTitle')}</p>

      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 max-w-lg mb-6'>
        <p className='text-ink font-medium mb-3'>{t('language')}</p>
        <div className='flex gap-2 mb-1'>
          {availableLanguages.map(l => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${lang === l.code ? 'bg-accent text-white' : 'bg-bg border border-hairline text-ink'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 max-w-lg mb-6'>
        <FontSizeControl label={t('textSize')} />
      </div>

      <InstallAppCard />

      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 max-w-lg mb-6'>
        <div className='flex justify-between items-center'>
          <div>
            <p className='text-ink font-medium'>{t('requirePassport')}</p>
            <p className='text-muted text-sm mt-1'>{t('requirePassportHint')}</p>
          </div>
          <button
            onClick={() => updateSettings({ passportRequired: !settings.passportRequired })}
            className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${settings.passportRequired ? 'bg-accent' : 'bg-hairline'}`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${settings.passportRequired ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 max-w-lg'>
        <p className='text-ink font-medium mb-1'>{t('studentAppLanguages')}</p>
        <p className='text-muted text-sm mb-4'>{t('studentAppLanguagesHint')}</p>
        <div className='flex flex-col gap-3'>
          {STUDENT_LANGUAGES.map(l => {
            const on = enabledLanguages.includes(l.code)
            return (
              <div key={l.code} className='flex justify-between items-center'>
                <p className='text-ink text-sm'>{l.label}</p>
                <button
                  onClick={() => toggleLanguage(l.code)}
                  className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${on ? 'bg-accent' : 'bg-hairline'}`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Settings
