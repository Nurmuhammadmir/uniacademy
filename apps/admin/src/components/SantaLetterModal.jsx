import React, { useContext, useState } from 'react'
import { Gift } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from './Modal.jsx'

// New Year mode's "write a letter to Ded Moroz" - really just to the director (Salamatdin aga),
// framed playfully for the season. An admin signs their own name and writes a wish; it's visible
// on the director's side (SantaLettersModal, director app) from the moment it's sent - no draft
// state, no edit/delete here once submitted.
const SantaLetterModal = ({ onClose }) => {
  const { createSantaLetter } = useContext(AdminContext)
  const { t } = useLanguage()
  const [fromName, setFromName] = useState('')
  const [wish, setWish] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!fromName.trim() || !wish.trim() || submitting) return
    setSubmitting(true)
    const ok = await createSantaLetter(fromName.trim(), wish.trim())
    setSubmitting(false)
    if (ok) setSent(true)
  }

  return (
    <Modal title={t('santaLetterTitle')} onClose={onClose}>
      {sent ? (
        <div className='flex flex-col items-center text-center gap-3 py-4'>
          <Gift size={36} strokeWidth={1.5} className='text-accent' />
          <p className='text-ink font-medium'>{t('santaLetterSentTitle')}</p>
          <p className='text-muted text-sm'>{t('santaLetterSentHint')}</p>
          <button onClick={onClose} className='mt-2 px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium'>
            {t('close')}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className='flex flex-col gap-3'>
          <p className='text-muted text-xs -mt-1'>{t('santaLetterIntro')}</p>
          <div>
            <p className='text-xs text-muted mb-1'>{t('santaLetterFromLabel')}</p>
            <input value={fromName} onChange={e => setFromName(e.target.value)} maxLength={200}
              className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required autoFocus />
          </div>
          <div>
            <p className='text-xs text-muted mb-1'>{t('santaLetterWishLabel')}</p>
            <textarea value={wish} onChange={e => setWish(e.target.value)} maxLength={2000} rows={5}
              className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
          </div>
          <button type='submit' disabled={submitting || !fromName.trim() || !wish.trim()}
            className='py-2.5 rounded-xl bg-accent text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2'>
            <Gift size={16} strokeWidth={1.75} />
            {submitting ? t('sending') : t('santaLetterSendBtn')}
          </button>
        </form>
      )}
    </Modal>
  )
}

export default SantaLetterModal
