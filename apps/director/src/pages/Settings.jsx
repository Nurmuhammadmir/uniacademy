import React, { useContext } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'

const STUDENT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'uz', label: "Uzbek (O'zbekcha)" },
  { code: 'kaa', label: 'Karakalpak (Qaraqalpaqsha)' },
]

const Settings = () => {
  const { settings, updateSettings } = useContext(DirectorContext)

  if (!settings) return <p className='text-muted'>Loading settings…</p>

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
      <p className='font-display text-2xl text-ink mb-6'>Settings</p>

      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 max-w-lg mb-6'>
        <div className='flex justify-between items-center'>
          <div>
            <p className='text-ink font-medium'>Require passport info for new students</p>
            <p className='text-muted text-sm mt-1'>When on, an admin can't register a student without entering their passport/ID details. Defaults to on.</p>
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
        <p className='text-ink font-medium mb-1'>Student app languages</p>
        <p className='text-muted text-sm mb-4'>Which languages a student can switch their app's interface into. This only affects the app's own menus/buttons - homework content stays in whatever language you wrote it in.</p>
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
