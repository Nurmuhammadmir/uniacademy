import React from 'react'
import { useLanguage } from '../i18n/LanguageContext.jsx'

// shared result panel for the vocab word bank and grammar bank - same shape, different unit noun
// unitKey is one of 'word' | 'question' | 'reading' - looked up against the translated unit nouns
const BankFillResult = ({ daysFilled, used, remaining, emptyDaysRemaining, filled, skipped, unitKey }) => {
  const { t } = useLanguage()
  if (daysFilled === undefined) return null
  const unit = t(unitKey === 'question' ? 'unitQuestion' : unitKey === 'reading' ? 'unitReading' : 'unitWord')
  return (
    <div className='bg-accent-soft rounded-xl p-3 text-sm text-ink flex flex-col gap-1'>
      <p>{t('filledDaysUsing', { days: daysFilled, daysPlural: daysFilled === 1 ? '' : 's', used, unit })}</p>
      {remaining > 0 && <p className='text-muted'>{t('leftOverNote', { remaining, unit })}</p>}
      {emptyDaysRemaining > 0 && <p className='text-muted'>{t('stillEmptyNote', { count: emptyDaysRemaining, plural: emptyDaysRemaining === 1 ? '' : 's' })}</p>}
      {filled?.length > 0 && (
        <p className='text-muted font-mono text-xs'>{t('daysColonList', { list: filled.map(f => `${f.day} (${f.count})`).join(', ') })}</p>
      )}
      {skipped?.length > 0 && (
        <div className='mt-1 pt-2 border-t border-hairline/50'>
          <p className='text-ink'>{t('skippedAsDuplicatePlural', { count: skipped.length, plural: skipped.length === 1 ? '' : 's' })}</p>
          <div className='max-h-32 overflow-y-auto mt-1 flex flex-col gap-0.5'>
            {skipped.map((s, i) => (
              <p key={i} className='text-muted text-xs'><span className='text-ink'>{s.text}</span> - {s.reason}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default BankFillResult
