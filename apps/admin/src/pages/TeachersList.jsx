import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { RefreshCw, User, ShieldAlert } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import PasswordInput from '../components/PasswordInput.jsx'

// this screen is meant to live on a monitor at the reception desk (qabulxona) - split into a QR
// panel (left) teachers scan on arrival and a live "who's checked in today" roster (right), sized
// and spaced to be readable from a few steps away, not a dense admin table. Add/Edit is bolted onto
// this same roster (the only place admin has a teacher list at all) rather than a separate page -
// admin can add and edit teachers here, but never delete one (director-only, confirmed spec), so
// there is no delete action anywhere in this file, only a warning note explaining why.
const TeachersList = () => {
  const { teachers, createTeacherAttendanceQR, createTeacher, updateTeacher } = useContext(AdminContext)
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [qr, setQr] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', password: '' })
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', password: '' })

  const submitCreate = async (e) => {
    e.preventDefault()
    const ok = await createTeacher(form)
    if (ok) { setShowCreate(false); setForm({ name: '', phone: '', password: '' }) }
  }

  const openEdit = (e, teacher) => {
    e.stopPropagation()
    setEditing(teacher)
    setEditForm({ name: teacher.name, phone: teacher.phone, password: '' })
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const ok = await updateTeacher(editing._id, editForm)
    if (ok) setEditing(null)
  }

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
      <div className='flex justify-end mb-4'>
        <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>{t('addTeacher')}</button>
      </div>
    <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
      <div className='lg:col-span-5'>
        <div className='bg-white dark:bg-[#161F30] rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-md p-8 flex flex-col items-center justify-center'>
          <div className='bg-blue-50 text-blue-700 text-xs px-4 py-3 rounded-xl border border-blue-100 mb-6 text-center font-medium w-full dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'>
            {t('teacherQrHint')}
          </div>

          {qr ? (
            <>
              <div className='bg-white p-4 rounded-2xl border border-slate-100'>
                <QRCodeSVG value={qr.token} size={240} bgColor='#ffffff' fgColor='#1d1d1f' level='M' />
              </div>
              <div className='flex items-center gap-2 mt-5 text-slate-400 dark:text-slate-600 text-sm'>
                <RefreshCw size={15} strokeWidth={1.5} className='animate-spin [animation-duration:3s]' />
                {t('qrExpiresInSeconds', { seconds: secondsLeft })}
              </div>
            </>
          ) : (
            <p className='text-muted text-center'>{t('noQrYet')}</p>
          )}
        </div>
      </div>

      <div className='lg:col-span-7'>
        <div className='hidden md:block bg-white dark:bg-[#161F30] rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='text-left border-b border-slate-100 dark:border-slate-800/80'>
                <th className='px-5 py-3 font-medium text-slate-400 dark:text-slate-600 text-xs tracking-wider uppercase'>{t('nameCol')}</th>
                <th className='px-5 py-3 font-medium text-slate-400 dark:text-slate-600 text-xs tracking-wider uppercase'>{t('phoneCol')}</th>
                <th className='px-5 py-3 font-medium text-slate-400 dark:text-slate-600 text-xs tracking-wider uppercase'>{t('checkedInTodayCol')}</th>
                <th className='px-5 py-3'></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t2 => (
                <tr key={t2._id} onClick={() => navigate('/teachers/' + t2._id)} className='border-b border-slate-50 dark:border-slate-800/80 last:border-0 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors'>
                  <td className='px-5 py-4'>
                    <div className='flex items-center gap-2.5'>
                      <span className='w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/40 flex items-center justify-center flex-shrink-0'>
                        <User size={15} strokeWidth={1.5} className='text-slate-400 dark:text-slate-600' />
                      </span>
                      <span className='font-medium text-slate-900 dark:text-[#F8FAFC]'>{t2.name}</span>
                    </div>
                  </td>
                  <td className='px-5 py-4 text-muted font-mono'>{t2.phone}</td>
                  <td className='px-5 py-4'>
                    {t2.checkedInToday ? (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${t2.late ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'}`}>
                        {t('checkedIn')} · {new Date(t2.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{t2.late ? ` · ${t('lateBadge')}` : ''}
                      </span>
                    ) : (
                      <span className='text-xs font-medium px-3 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800/80'>{t('notCheckedIn')}</span>
                    )}
                  </td>
                  <td className='px-5 py-4 text-right'>
                    <button onClick={(e) => openEdit(e, t2)} className='text-accent text-xs font-medium'>{t('edit')}</button>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr><td colSpan={4} className='px-5 py-8 text-center text-muted'>{t('noTeachersYet')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className='block md:hidden flex flex-col gap-2.5'>
          {teachers.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noTeachersYet')}</p>}
          {teachers.map(t2 => (
            <div key={t2._id}
              className='bg-white dark:bg-[#161F30] rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm dark:shadow-black/40 w-full'>
              <button onClick={() => navigate('/teachers/' + t2._id)} className='plain flex items-center gap-2.5 min-w-0 text-left w-full'>
                <span className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800/40 flex items-center justify-center flex-shrink-0'>
                  <User size={16} strokeWidth={1.5} className='text-slate-400 dark:text-slate-600' />
                </span>
                <div className='min-w-0'>
                  <p className='font-semibold text-[#1D1D1F] dark:text-[#F8FAFC] text-sm truncate'>{t2.name}</p>
                  <p className='text-xs text-slate-400 dark:text-slate-600 mt-0.5 font-mono'>{t2.phone}</p>
                </div>
              </button>
              <div className='flex items-center justify-between mt-2.5'>
                {t2.checkedInToday ? (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${t2.late ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'}`}>
                    {t('checkedIn')} · {new Date(t2.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{t2.late ? ` · ${t('lateBadge')}` : ''}
                  </span>
                ) : (
                  <span className='text-xs font-medium px-3 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800/80'>{t('notCheckedIn')}</span>
                )}
                <button onClick={(e) => openEdit(e, t2)} className='text-accent text-xs font-medium flex-shrink-0'>{t('edit')}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

      {showCreate && (
        <Modal title={t('addTeacherTitle')} onClose={() => setShowCreate(false)}>
          <form onSubmit={submitCreate} className='flex flex-col gap-3'>
            <input placeholder={t('teacherName')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('teacherPhone')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <PasswordInput placeholder={t('teacherPassword')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <div className='flex items-start gap-2 bg-amber-50 text-amber-800 text-xs px-3 py-2.5 rounded-xl border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'>
              <ShieldAlert size={15} strokeWidth={1.75} className='flex-shrink-0 mt-0.5' />
              <span>{t('onlyDirectorCanDeleteTeacherNote')}</span>
            </div>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('createTeacherBtn')}</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={t('editTeacherTitle', { name: editing.name })} onClose={() => setEditing(null)}>
          <form onSubmit={submitEdit} className='flex flex-col gap-3'>
            <input placeholder={t('teacherName')} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('teacherPhone')} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <PasswordInput placeholder={t('newPasswordLeaveBlank')} value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            <div className='flex items-start gap-2 bg-amber-50 text-amber-800 text-xs px-3 py-2.5 rounded-xl border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'>
              <ShieldAlert size={15} strokeWidth={1.75} className='flex-shrink-0 mt-0.5' />
              <span>{t('onlyDirectorCanDeleteTeacherNote')}</span>
            </div>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('saveChanges')}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default TeachersList
