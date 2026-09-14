import { useLanguage } from '../context/LanguageContext'
import { LANGUAGES } from '../i18n/translations'

const LanguageSwitcher = ({ dark = false }: { dark?: boolean }) => {
  const { lang, setLang } = useLanguage()

  return (
    <div className={`inline-flex items-center rounded-lg p-0.5 gap-0.5 ${dark ? 'bg-white/10' : 'bg-gray-100'}`}>
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150
            ${lang === l.code
              ? (dark ? 'bg-white text-[#0066CC]' : 'bg-white text-[#0066CC] shadow-sm')
              : (dark ? 'text-blue-100 hover:text-white' : 'text-gray-500 hover:text-gray-800')}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

export default LanguageSwitcher
