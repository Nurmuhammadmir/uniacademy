import { Droplets } from 'lucide-react'
import { getQuoteOfTheDay } from '../i18n/quotes'
import { useLanguage } from '../context/LanguageContext'

const QuoteOfTheDay = () => {
  const { lang, t } = useLanguage()
  const quote = getQuoteOfTheDay()

  return (
    <div className="bg-[#0066CC] rounded-2xl p-5 text-white relative overflow-hidden mb-6">
      <Droplets className="absolute -right-3 -bottom-3 opacity-10" size={90} strokeWidth={1} />
      <div className="text-[11px] font-medium uppercase tracking-wider text-blue-100 mb-2 relative z-10">
        {t('quote.label')}
      </div>
      <p className="font-display italic text-base leading-relaxed relative z-10">"{quote[lang]}"</p>
    </div>
  )
}

export default QuoteOfTheDay
