import React, { useEffect, useState } from 'react'
import Modal from './Modal.jsx'

const GroupProfileModal = ({ groupId, getGroupProfile, onViewStudent, onViewTeacher, onClose }) => {
  const [group, setGroup] = useState(false)

  useEffect(() => { getGroupProfile(groupId).then(setGroup) }, [groupId])

  return (
    <Modal title='Group profile' onClose={onClose} wide>
      {!group ? (
        <p className='text-muted'>Loading…</p>
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
              <p className='text-muted text-xs mb-1'>Day</p>
              <p className='font-mono text-ink'>{group.dayCounter}/{group.levelId?.durationDays || 30}</p>
            </div>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>Students</p>
              <p className='font-mono text-ink'>{group.studentIds.length}/{group.capacity}</p>
            </div>
            <div className='bg-bg border border-hairline rounded-xl p-4'>
              <p className='text-muted text-xs mb-1'>Status</p>
              <p className='text-ink capitalize'>{group.status}</p>
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>Roster</p>
            <div className='flex flex-col gap-1'>
              {group.studentIds.map(s => (
                <button key={s._id} onClick={() => onViewStudent(s._id)} className='text-left flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-ink'>{s.name}</span>
                  <span className='text-muted font-mono text-xs'>{s.phone}</span>
                </button>
              ))}
              {group.studentIds.length === 0 && <p className='text-muted text-sm'>No students in this group yet.</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default GroupProfileModal
