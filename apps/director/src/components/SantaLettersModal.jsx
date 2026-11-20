import React, { useContext, useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from './Modal.jsx'

// read-only counterpart to the admin app's SantaLetterModal - admins write these, the director
// (Salamatdin aga) just reads them here, newest first
const SantaLettersModal = ({ onClose }) => {
  const { getSantaLetters } = useContext(DirectorContext)
  const { t, lang } = useLanguage()
  const [letters, setLetters] = useState(null)

  useEffect(() => {
    getSantaLetters().then(setLetters)
  }, [])

  return (
    <Modal title={t('santaLettersTitle')} onClose={onClose} wide>
      {letters === null ? (
        <p className='text-muted text-sm py-4 text-center'>{t('loading')}</p>
      ) : letters.length === 0 ? (
        <div className='flex flex-col items-center text-center gap-2 py-6'>
          <Gift size={32} strokeWidth={1.5} className='text-muted' />
          <p className='text-muted text-sm'>{t('santaLettersEmpty')}</p>
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          {letters.map(letter => (
            <div key={letter._id} className='rounded-xl border border-hairline p-4'>
              <div className='flex justify-between items-baseline gap-3 mb-2'>
                <p className='font-medium text-ink'>{letter.fromName}</p>
                <p className='text-xs text-muted whitespace-nowrap'>
                  {new Date(letter.createdAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-US')}
                </p>
              </div>
              <p className='text-sm text-ink whitespace-pre-wrap mb-2'>{letter.wish}</p>
              {letter.branchId?.name && (
                <p className='text-xs text-muted'>{letter.branchId.name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default SantaLettersModal
