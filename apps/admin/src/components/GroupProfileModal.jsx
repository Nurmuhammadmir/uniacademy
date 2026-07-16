import React, { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const GroupProfileModal = ({ groupId, getGroupProfile, onViewStudent, onViewTeacher, onClose }) => {
  const [group, setGroup] = useState(false)
  const { t } = useLanguage()

  useEffect(() => { getGroupProfile(groupId).then(setGroup) }, [groupId])

  return (
    <Modal title={t('groupProfile')} onClose={onClose} wide>
      {!group ? (
        <p className='text-muted'>{t('loading')}</p>
      ) : (
        <div className='flex flex-col gap-5'>
          <div>
            <p className='font-display text-xl text-ink'>{group.languageId?.name} · {group.levelId?.name}</p>
            <p className='text-muted text-sm'>
              <button onClick={() => onViewTeacher(group.teacherId._id)} className='hover:underline text-accent'>{group.teacherId?.name}</button>
              {' · '}{group.schedulePattern.replaceAll('_', '/')} {group.time}
            </p>
          </div>

          <div className='grid grid-cols-3 gap-4'>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>{t('dayLabel')}</p>
              <p className='font-mono text-ink'>{group.dayCounter}/{group.levelId?.durationDays || 30}</p>
            </div>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>{t('studentsLabel')}</p>
              <p className='font-mono text-ink'>{group.studentIds.length}/{group.capacity}</p>
            </div>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>{t('statusLabel')}</p>
              <p className='text-ink capitalize'>{group.status}</p>
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>{t('roster')}</p>
            <div className='flex flex-col gap-1'>
              {group.studentIds.map(s => (
                <button key={s._id} onClick={() => onViewStudent(s._id)} className='text-left flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-ink'>{s.name}</span>
                  <span className='text-muted font-mono text-xs'>{s.phone}</span>
                </button>
              ))}
              {group.studentIds.length === 0 && <p className='text-muted text-sm'>{t('noStudentsInGroupYet')}</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default GroupProfileModal
