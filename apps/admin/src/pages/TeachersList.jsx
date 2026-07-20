import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const TeachersList = () => {
  const { teachers, createTeacherAttendanceQR } = useContext(AdminContext)
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [qr, setQr] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const refresh = async () => {
    const data = await createTeacherAttendanceQR(true)
    if (data) setQr(data.qr)
  }

  // a code only lasts 2 minutes, so this screen keeps itself alive - refresh well before expiry
  // rather than waiting for a teacher to complain the code stopped working
  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 90 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!qr) return
    const tick = () => setSecondsLeft(Math.max(0, Math.round((new Date(qr.expiresAt) - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [qr])

  return (
    <div>
      <p className='text-muted mb-6'>{t('teacherQrHint')}</p>

      <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 mb-8 flex flex-col items-center max-w-sm'>
        {qr ? (
          <>
            <div className='bg-white p-4 rounded-2xl'>
              <QRCodeSVG value={qr.token} size={220} bgColor='#ffffff' fgColor='#231F1A' level='M' />
            </div>
            <p className='text-muted text-xs mt-3 text-center'>
              {t('qrExpiresInSeconds', { seconds: secondsLeft })}
            </p>
          </>
        ) : (
          <p className='text-muted text-center'>{t('noQrYet')}</p>
        )}
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>{t('nameCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('phoneCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('checkedInTodayCol')}</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map(t2 => (
              <tr key={t2._id} onClick={() => navigate('/teachers/' + t2._id)} className='border-b border-hairline last:border-0 cursor-pointer hover:bg-bg'>
                <td className='px-5 py-4 text-ink'>{t2.name}</td>
                <td className='px-5 py-4 text-muted font-mono'>{t2.phone}</td>
                <td className='px-5 py-4'>
                  {t2.checkedInToday ? (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${t2.late ? 'bg-red-100 text-red-500' : 'bg-accent-soft text-accent'}`}>
                      {t('checkedIn')} · {new Date(t2.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{t2.late ? ` · ${t('lateBadge')}` : ''}
                    </span>
                  ) : (
                    <span className='text-xs font-medium px-2 py-1 rounded-full bg-hairline text-muted'>{t('notCheckedIn')}</span>
                  )}
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={3} className='px-5 py-8 text-center text-muted'>{t('noTeachersYet')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TeachersList
