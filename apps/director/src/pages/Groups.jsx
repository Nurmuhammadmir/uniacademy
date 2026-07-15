import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import Modal from '../components/Modal.jsx'

const SCHEDULES = ['MON_WED_FRI', 'TUE_THU_SAT']

const Groups = () => {
  const { allGroups, updateGroupLimits, teachers, branches } = useContext(DirectorContext)
  const [branchFilter, setBranchFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ teacherId: '', schedulePattern: '', time: '', capacity: 20 })

  const visibleGroups = allGroups.filter(g => !branchFilter || g.branchId?._id === branchFilter)

  const openEdit = (group) => {
    setEditing(group)
    setForm({ teacherId: group.teacherId?._id, schedulePattern: group.schedulePattern, time: group.time, capacity: group.capacity })
  }

  const submit = async (e) => {
    e.preventDefault()
    const ok = await updateGroupLimits(editing._id, form)
    if (ok) setEditing(null)
  }

  const branchTeachers = editing ? teachers.filter(t => t.branchId?._id === editing.branchId?._id) : []

  return (
    <div>
      <div className='flex justify-between items-center mb-4'>
        <p className='font-display text-2xl text-ink'>All groups</p>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className='px-3 py-2 rounded-xl bg-bg-elevated border border-hairline text-sm'>
          <option value=''>Any branch</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>Branch</th>
              <th className='px-5 py-3 font-medium'>Course</th>
              <th className='px-5 py-3 font-medium'>Teacher</th>
              <th className='px-5 py-3 font-medium'>Schedule</th>
              <th className='px-5 py-3 font-medium'>Capacity</th>
              <th className='px-5 py-3 font-medium'>Status</th>
              <th className='px-5 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map(g => (
              <tr key={g._id} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-3 text-muted'>{g.branchId?.name}</td>
                <td className='px-5 py-3 text-ink'>{g.languageId?.name} · {g.levelId?.name}</td>
                <td className='px-5 py-3 text-muted'>{g.teacherId?.name}</td>
                <td className='px-5 py-3 text-muted text-xs'>{g.schedulePattern.replaceAll('_', '/')} {g.time}</td>
                <td className='px-5 py-3 font-mono text-accent'>{g.studentIds.length}/{g.capacity}</td>
                <td className='px-5 py-3 text-muted text-xs capitalize'>{g.status}</td>
                <td className='px-5 py-3 text-right'>
                  <button onClick={() => openEdit(g)} className='text-accent text-xs font-medium'>Edit limits</button>
                </td>
              </tr>
            ))}
            {visibleGroups.length === 0 && (
              <tr><td colSpan={7} className='px-5 py-8 text-center text-muted'>No groups found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={`Edit ${editing.languageId?.name} · ${editing.levelId?.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={submit} className='flex flex-col gap-3'>
            <select value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              {branchTeachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
            <select value={form.schedulePattern} onChange={e => setForm({ ...form, schedulePattern: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline'>
              {SCHEDULES.map(s => <option key={s} value={s}>{s.replaceAll('_', '/')}</option>)}
            </select>
            <input type='time' value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input type='number' placeholder='Capacity (max students)' value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>Save changes</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default Groups
