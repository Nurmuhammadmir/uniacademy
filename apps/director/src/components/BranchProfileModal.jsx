import React, { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { formatMoney } from '../lib/format.js'

const BranchProfileModal = ({ branchId, getBranchProfile, onClose }) => {
  const [data, setData] = useState(false)

  useEffect(() => { getBranchProfile(branchId).then(setData) }, [branchId])

  return (
    <Modal title='Branch profile' onClose={onClose} wide>
      {!data ? (
        <p className='text-muted'>Loading…</p>
      ) : (
        <div className='flex flex-col gap-5'>
          <p className='font-display text-xl text-ink'>{data.branch.name}</p>

          <div className='grid grid-cols-3 gap-4'>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>Students</p>
              <p className='font-mono text-2xl text-ink'>{data.students.length}</p>
            </div>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>Active groups</p>
              <p className='font-mono text-2xl text-ink'>{data.groups.length}</p>
            </div>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>Total revenue</p>
              <p className='font-mono text-2xl text-ink'>{formatMoney(data.revenue)}</p>
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>Admins</p>
            <div className='flex flex-col gap-1'>
              {data.admins.map(a => (
                <div key={a._id} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-ink'>{a.name}</span><span className='text-muted font-mono text-xs'>{a.phone}</span>
                </div>
              ))}
              {data.admins.length === 0 && <p className='text-muted text-sm'>No admins yet.</p>}
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>Teachers</p>
            <div className='flex flex-col gap-1'>
              {data.teachers.map(t => (
                <div key={t._id} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-ink'>{t.name}</span><span className='text-muted font-mono text-xs'>{t.phone}</span>
                </div>
              ))}
              {data.teachers.length === 0 && <p className='text-muted text-sm'>No teachers yet.</p>}
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>Active groups</p>
            <div className='flex flex-col gap-1'>
              {data.groups.map(g => (
                <div key={g._id} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-ink'>{g.languageId?.name} · {g.levelId?.name} · {g.teacherId?.name}</span>
                  <span className='text-muted'>{g.schedulePattern.replaceAll('_', '/')} {g.time}</span>
                </div>
              ))}
              {data.groups.length === 0 && <p className='text-muted text-sm'>No active groups.</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default BranchProfileModal
