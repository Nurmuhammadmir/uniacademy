import React, { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const TeacherProfileModal = ({ teacherId, getTeacherProfile, onClose }) => {
  const [data, setData] = useState(false)
  const { t } = useLanguage()

  useEffect(() => { getTeacherProfile(teacherId).then(setData) }, [teacherId])

  return (
    <Modal title={t('teacherProfile')} onClose={onClose} wide>
      {!data ? (
        <p className='text-muted'>{t('loading')}</p>
      ) : (
        <div className='flex flex-col gap-5'>
          <div>
            <p className='font-display text-xl text-ink'>{data.teacher.name}</p>
            <p className='text-muted text-sm font-mono'>{data.teacher.phone}</p>
            <p className='text-muted text-xs mt-1'>{t('workingSince', { branch: data.teacher.branchId?.name, date: new Date(data.employedSince).toLocaleDateString() })}</p>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>{t('activeGroups')}</p>
              <p className='font-mono text-2xl text-ink'>{data.activeGroupsCount}</p>
            </div>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>{t('currentStudents')}</p>
              <p className='font-mono text-2xl text-ink'>{data.totalStudents}</p>
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>{t('allGroupsHistory')}</p>
            <div className='flex flex-col gap-1'>
              {data.groups.map(g => (
                <div key={g._id} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-ink'>{g.languageId?.name} · {g.levelId?.name} · {g.schedulePattern.replaceAll('_', '/')} {g.time}</span>
                  <span className='text-muted'>{t('groupStatusCount', { status: g.status, count: g.studentIds.length })}</span>
                </div>
              ))}
              {data.groups.length === 0 && <p className='text-muted text-sm'>{t('noGroupsAssignedYet')}</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default TeacherProfileModal
