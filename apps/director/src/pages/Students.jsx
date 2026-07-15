import React, { useContext, useMemo, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import StudentProfileModal from '../components/StudentProfileModal.jsx'

const Students = () => {
  const { allStudents, getStudentProfile, branches, languages, levels, getLevels } = useContext(DirectorContext)
  const [viewingId, setViewingId] = useState(null)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')

  const isExpired = (c) => !c.subscriptionExpiresAt || new Date(c.subscriptionExpiresAt) < new Date()
  const courseSummary = (student) => student.courses.length === 0 ? '—' : student.courses.map(c => `${c.languageId?.name} · ${c.levelId?.name}`).join(', ')
  const anyActive = (student) => student.courses.some(c => c.isActive)

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allStudents.filter(s => {
      if (q && !s.name.toLowerCase().includes(q) && !s.phone.toLowerCase().includes(q)) return false
      if (branchFilter && s.branchId?._id !== branchFilter) return false
      if (languageFilter && !s.courses.some(c => c.languageId?._id === languageFilter)) return false
      if (levelFilter && !s.courses.some(c => c.levelId?._id === levelFilter)) return false
      return true
    })
  }, [allStudents, search, branchFilter, languageFilter, levelFilter])

  return (
    <div>
      <p className='font-display text-2xl text-ink mb-4'>All students</p>

      <div className='flex flex-wrap gap-3 mb-4'>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder='Search by name or phone…'
          className='flex-1 max-w-sm px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm' />
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className='px-3 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm'>
          <option value=''>Any branch</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select value={languageFilter} onChange={e => { setLanguageFilter(e.target.value); if (e.target.value) getLevels(e.target.value) }} className='px-3 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm'>
          <option value=''>Any language</option>
          {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className='px-3 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm'>
          <option value=''>Any level</option>
          {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>
        {(search || branchFilter || languageFilter || levelFilter) && (
          <button onClick={() => { setSearch(''); setBranchFilter(''); setLanguageFilter(''); setLevelFilter('') }} className='text-muted text-sm'>Clear</button>
        )}
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>Name</th>
              <th className='px-5 py-3 font-medium'>Phone</th>
              <th className='px-5 py-3 font-medium'>Branch</th>
              <th className='px-5 py-3 font-medium'>Courses</th>
              <th className='px-5 py-3 font-medium'>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map(s => (
              <tr key={s._id} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-3 text-ink'>
                  <button onClick={() => setViewingId(s._id)} className='hover:underline text-left'>{s.name}</button>
                </td>
                <td className='px-5 py-3 text-muted font-mono'>{s.phone}</td>
                <td className='px-5 py-3 text-muted'>{s.branchId?.name}</td>
                <td className='px-5 py-3 text-muted'>{courseSummary(s)}</td>
                <td className='px-5 py-3'>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${anyActive(s) ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>
                    {anyActive(s) ? 'active' : 'unpaid'}
                  </span>
                </td>
              </tr>
            ))}
            {visibleStudents.length === 0 && (
              <tr><td colSpan={5} className='px-5 py-8 text-center text-muted'>{allStudents.length === 0 ? 'No students yet.' : 'No students match these filters.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewingId && (
        <StudentProfileModal studentId={viewingId} getStudentProfile={getStudentProfile} onClose={() => setViewingId(null)} />
      )}
    </div>
  )
}

export default Students
