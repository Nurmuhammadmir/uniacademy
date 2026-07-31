import React, { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const AdminProfileModal = ({ adminId, getAdminProfile, onClose }) => {
  const [data, setData] = useState(false)
  const { t } = useLanguage()

  useEffect(() => { getAdminProfile(adminId).then(setData) }, [adminId])

  return (
    <Modal title={t('adminProfile')} onClose={onClose}>
      {!data ? (
        <p className='text-muted'>{t('loading')}</p>
      ) : (
        <div className='flex flex-col gap-5'>
          <div>
            <p className='font-display text-xl text-ink'>{data.admin.name}</p>
            <p className='text-muted text-sm font-mono'>{data.admin.phone}</p>
            <p className='text-muted text-xs mt-1'>{t('sinceDate', { branch: data.admin.branchId?.name, date: new Date(data.admin.createdAt).toLocaleDateString() })}</p>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>{t('studentsAddedAllTime')}</p>
              <p className='font-mono text-2xl text-ink'>{data.totalStudentsAdded}</p>
            </div>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>{t('addedThisMonth')}</p>
              <p className='font-mono text-2xl text-ink'>{data.studentsAddedThisMonth}</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default AdminProfileModal
