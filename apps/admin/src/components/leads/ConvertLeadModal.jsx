import React, { lazy, Suspense, useContext, useState } from 'react'
import { AdminContext } from '../../context/AdminContext.jsx'
import Modal from '../Modal.jsx'
import PasswordInput from '../PasswordInput.jsx'
import Select from '../Select.jsx'
import DatePicker from '../DatePicker.jsx'
import Spinner from '../Spinner.jsx'
import { groupLabel, formatMoney } from '../../lib/format.js'
import { todayISO } from '../../lib/date.js'

const MapPicker = lazy(() => import('../MapPicker.jsx'))
const MapFallback = () => (
  <div className='h-56 rounded-xl bg-bg border border-hairline flex items-center justify-center'>
    <Spinner size={20} className='text-accent dark:text-[#818CF8]' />
  </div>
)

// same required fields as the Students page's own "add student" form (password, location,
// passport, optional group) - a lead only ever has a name/phone, so this collects everything else
// a real student record needs, pre-filled from the lead so the admin isn't retyping what's already
// on the card. Deliberately does NOT create the lead-to-student link itself - the caller does that
// (convertLead) once createStudent actually succeeds, so a failed student creation never leaves a
// lead falsely marked as converted.
const ConvertLeadModal = ({ lead, onClose, onConverted, t }) => {
  const { createStudent, convertLead, groups, settings } = useContext(AdminContext)
  const [form, setForm] = useState({
    name: lead.name, phone: lead.phone, password: '', dateOfBirth: '', passportInfo: '',
    groupId: '', enrolledAt: todayISO(), address: '', geo: { lat: null, lng: null },
    parentPhone: '', parentPassword: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (form.geo.lat == null || form.geo.lng == null) return
    setSubmitting(true)
    const student = await createStudent({ ...form, groupId: form.groupId || undefined })
    if (student) {
      await convertLead(lead._id, student._id)
      onConverted(lead._id, student)
    }
    setSubmitting(false)
  }

  return (
    <Modal title={t('convertLeadModalTitle')} onClose={onClose}>
      <form onSubmit={submit} className='flex flex-col gap-3'>
        <input placeholder={t('fullName')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
        <input placeholder={t('phoneNumber')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
          className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
        <PasswordInput placeholder={t('password')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
          className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
        <div>
          <label className='text-xs text-muted mb-1 block'>{t('dateOfBirthLabel')}</label>
          <DatePicker withYearSelect value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} />
        </div>
        <input
          placeholder={settings?.passportRequired === false ? t('passportIdInfoOptional') : t('passportIdInfo')}
          value={form.passportInfo}
          onChange={e => setForm({ ...form, passportInfo: e.target.value })}
          className='px-4 py-3 rounded-xl bg-bg border border-hairline'
          required={settings?.passportRequired !== false}
        />
        <p className='text-xs text-muted -mb-1'>{t('selectGroupOptionalHint')}</p>
        <Select forceSearch value={form.groupId} onChange={(v) => setForm({ ...form, groupId: v })} placeholder={t('noGroupOption')}
          options={[{ value: '', label: t('noGroupOption') }, ...groups.filter(g => g.status === 'active').map(g => ({
            value: g._id, label: `${groupLabel(g)} · ${g.languageId?.name}${g.levelId?.name ? ' · ' + g.levelId.name : ''} · ${formatMoney(g.price)}`,
          }))]} />
        {form.groupId && (
          <div>
            <label className='text-xs text-muted mb-1 block'>{t('enrolledAtLabel')}</label>
            <DatePicker value={form.enrolledAt} onChange={(v) => setForm({ ...form, enrolledAt: v })} />
          </div>
        )}
        <p className='text-xs text-muted -mb-1'>{t('locationRequiredHint')}</p>
        <Suspense fallback={<MapFallback />}>
          <MapPicker address={form.address} lat={form.geo.lat} lng={form.geo.lng}
            onChange={({ lat, lng, address }) => setForm({ ...form, address, geo: { lat, lng } })} />
        </Suspense>
        <input placeholder={t('parentPhoneLabel')} value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })}
          className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
        {form.parentPhone && (
          <PasswordInput placeholder={t('parentPasswordLabel')} value={form.parentPassword} onChange={e => setForm({ ...form, parentPassword: e.target.value })}
            className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
        )}
        <button type='submit' disabled={submitting} className='py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-50 dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 flex items-center justify-center gap-2'>
          {submitting && <Spinner size={14} />} {t('createStudentBtn')}
        </button>
      </form>
    </Modal>
  )
}

export default ConvertLeadModal
