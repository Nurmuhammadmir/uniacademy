import React, { useEffect, useState } from 'react'
import Modal from './Modal.jsx'

const AdminProfileModal = ({ adminId, getAdminProfile, onClose }) => {
  const [data, setData] = useState(false)

  useEffect(() => { getAdminProfile(adminId).then(setData) }, [adminId])

  return (
    <Modal title='Admin profile' onClose={onClose}>
      {!data ? (
        <p className='text-muted'>Loading…</p>
      ) : (
        <div className='flex flex-col gap-5'>
          <div>
            <p className='font-display text-xl text-ink'>{data.admin.name}</p>
            <p className='text-muted text-sm font-mono'>{data.admin.phone}</p>
            <p className='text-muted text-xs mt-1'>{data.admin.branchId?.name} · since {new Date(data.admin.createdAt).toLocaleDateString()}</p>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>Students added (all-time)</p>
              <p className='font-mono text-2xl text-ink'>{data.totalStudentsAdded}</p>
            </div>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>Added this month</p>
              <p className='font-mono text-2xl text-ink'>{data.studentsAddedThisMonth}</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default AdminProfileModal
