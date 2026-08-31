import React, { useContext, useState } from 'react'
import { Users2 } from 'lucide-react'
import { SubDirectorContext } from '../context/SubDirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'

const SCHEDULES = ['MON_WED_FRI', 'TUE_THU_SAT']
const STATUS_DOT = { active: 'bg-emerald-500', archived: 'bg-rose-400' }

// a compact fill bar reads faster than "12/20" alone, and turns amber/red as a group actually
// approaches/hits capacity - the exact number is still right there for anyone who wants it
const CapacityBar = ({ filled, total }) => {
  const pct = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0
  const color = pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-accent'
  return (
    <div className='flex items-center gap-2'>
      <span className='font-mono text-ink text-xs w-12'>{filled}/{total}</span>
      <div className='w-16 h-1.5 rounded-full bg-hairline overflow-hidden'>
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// purely a visual heads-up - confirmed spec: the system never touches a group's own status
// automatically, ever. Red from 1 day out through however long it's been sitting past its end
// date, amber for a gentler 2-7 day heads-up before that.
const EndingSoonBadge = ({ g, t }) => {
  if (!g.endDate) return null
  const remaining = Math.ceil((new Date(g.endDate) - new Date()) / 86400000)
  if (remaining > 7) return null
  const isUrgent = remaining <= 1
  const label = remaining < 0 ? t('endedDaysAgoBadge', { days: -remaining }) : t('endingSoonBadge', { days: remaining })
  return (
    <span className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${isUrgent ? 'bg-rose-500/15 text-rose-600' : 'bg-amber-500/15 text-amber-600'}`}>
      {label}
    </span>
  )
}

const Groups = () => {
  const { allGroups, updateGroupLimits, teachers, branches } = useContext(SubDirectorContext)
  const { t } = useLanguage()
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

  const branchTeachers = editing ? teachers.filter(tc => tc.branchId?._id === editing.branchId?._id) : []

  return (
    <div>
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4'>
        <div className='flex items-baseline gap-3'>
          <p className='font-display text-2xl text-ink'>{t('allGroupsTitle')}</p>
          <span className='text-sm font-medium text-muted'>{visibleGroups.length}</span>
        </div>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className='px-3 py-2 rounded-xl bg-bg-elevated border border-hairline text-sm transition-colors hover:border-accent/30'>
          <option value=''>{t('anyBranch')}</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden overflow-x-auto shadow-sm'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>{t('branch')}</th>
              <th className='px-5 py-3 font-medium'>{t('courseCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('teacherCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('scheduleCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('capacity')}</th>
              <th className='px-5 py-3 font-medium'>{t('status')}</th>
              <th className='px-5 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map(g => (
              <tr key={g._id} className='border-b border-hairline last:border-0 transition-colors hover:bg-bg'>
                <td className='px-5 py-4 text-muted'>{g.branchId?.name}</td>
                <td className='px-5 py-4 text-ink font-medium'>
                  <div className='flex items-center gap-2'>
                    <span>{g.languageId?.name} · {g.levelId?.name}</span>
                    <EndingSoonBadge g={g} t={t} />
                  </div>
                </td>
                <td className='px-5 py-4 text-muted'>{g.teacherId?.name}</td>
                <td className='px-5 py-4 text-muted text-xs'>{g.schedulePattern.replaceAll('_', '/')} {g.time}{g.roomId?.name ? ` · ${g.roomId.name}` : ''}</td>
                <td className='px-5 py-4'><CapacityBar filled={g.studentIds.length} total={g.capacity} /></td>
                <td className='px-5 py-4 text-muted text-xs capitalize'>
                  <span className='inline-flex items-center gap-1.5'>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[g.status] || 'bg-slate-400'}`} /> {g.status}
                  </span>
                </td>
                <td className='px-5 py-4 text-right'>
                  <button onClick={() => openEdit(g)} className='text-accent text-xs font-medium hover:opacity-70 transition-opacity'>{t('editLimits')}</button>
                </td>
              </tr>
            ))}
            {visibleGroups.length === 0 && (
              <tr><td colSpan={7} className='px-5 py-8 text-center text-muted'>{t('noGroupsFound')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {visibleGroups.length === 0 && <p className='text-muted text-sm text-center py-8'>{t('noGroupsFound')}</p>}
        {visibleGroups.map(g => (
          <div key={g._id} className='bg-bg-elevated border border-hairline rounded-xl p-3.5 shadow-sm flex items-center gap-3'>
            <span className='w-11 h-11 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 text-accent'>
              <Users2 size={18} strokeWidth={1.75} />
            </span>
            <div className='min-w-0 flex-1'>
              <div className='flex justify-between items-start gap-2'>
                <p className='text-ink font-semibold text-sm truncate'>{g.languageId?.name} · {g.levelId?.name}</p>
                <button onClick={() => openEdit(g)} className='text-accent text-xs font-medium flex-shrink-0'>{t('editLimits')}</button>
              </div>
              <EndingSoonBadge g={g} t={t} />
              <p className='text-muted text-xs mt-0.5'>{g.branchId?.name} · {g.teacherId?.name}</p>
              <p className='text-muted text-xs mt-0.5'>{g.schedulePattern.replaceAll('_', '/')} {g.time}{g.roomId?.name ? ` · ${g.roomId.name}` : ''}</p>
              <div className='flex items-center gap-3 mt-1.5'>
                <CapacityBar filled={g.studentIds.length} total={g.capacity} />
                <span className='text-muted text-xs capitalize inline-flex items-center gap-1.5'>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[g.status] || 'bg-slate-400'}`} /> {g.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={t('editX', { name: `${editing.languageId?.name} · ${editing.levelId?.name}` })} onClose={() => setEditing(null)}>
          <form onSubmit={submit} className='flex flex-col gap-3'>
            <select value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required>
              {branchTeachers.map(tc => <option key={tc._id} value={tc._id}>{tc.name}</option>)}
            </select>
            <select value={form.schedulePattern} onChange={e => setForm({ ...form, schedulePattern: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline'>
              {SCHEDULES.map(s => <option key={s} value={s}>{s.replaceAll('_', '/')}</option>)}
            </select>
            <input type='time' value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input type='number' placeholder={t('capacityMaxStudents')} value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('saveChanges')}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default Groups
