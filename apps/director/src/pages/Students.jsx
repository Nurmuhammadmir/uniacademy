import React, { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download } from 'lucide-react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Select from '../components/Select.jsx'

// no photo field exists on a student - every avatar is initials on a gradient, picked
// deterministically from the name so the same student always lands on the same color
const AVATAR_GRADIENTS = [
  'from-[#FF6B6B] to-[#FF3B30]', 'from-[#FF9F43] to-[#FF9500]', 'from-[#34C759] to-[#30B94D]',
  'from-[#5AC8FA] to-[#007AFF]', 'from-[#5E5CE6] to-[#4B4FE0]', 'from-[#BF5AF2] to-[#AF52DE]',
  'from-[#FF7EB9] to-[#FF2D55]', 'from-[#64D2FF] to-[#32ADE6]',
]
const avatarGradient = (name) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')

const Students = () => {
  const { allStudents, branches, languages, levels, getLevels } = useContext(DirectorContext)
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')

  // a course a student has since left keeps its entry (groupId cleared) only so admin-side balance
  // history can still trace what was ever billed for it - not something they're "currently taking"
  const currentCourses = (student) => student.courses.filter(c => c.groupId)
  const courseSummary = (student) => currentCourses(student).length === 0 ? '—' : currentCourses(student).map(c => `${c.languageId?.name} · ${c.levelId?.name}`).join(', ')
  const courseTags = (student) => currentCourses(student).map(c => c.languageId?.name).filter(Boolean)
  const anyActive = (student) => currentCourses(student).some(c => c.enrollmentStatus === 'active')
  // per-course balance was retired when billing moved to one pooled Account per student - this
  // reads that same real stored balance (see server/models/Account.js), not a per-course sum
  const totalBalance = (student) => student.owed || 0

  // one row per student, every detail in its own column - exports exactly whatever's currently
  // visible (respects the search/branch/language/level filters)
  const exportStudentsCSV = () => {
    const header = ['#', 'Name', 'Phone', 'Branch', 'Status', 'Courses', 'Total balance']
    const rows = visibleStudents.map((s, i) => [
      i + 1, s.name, s.phone, s.branchId?.name || '', anyActive(s) ? t('active') : t('unpaid'), courseSummary(s), totalBalance(s),
    ])
    // the leading "sep=," line is an Excel-only directive that forces it to use comma as the column
    // separator regardless of the machine's regional settings - without it, a Windows install whose
    // locale uses comma as the decimal separator (Uzbek/Russian, among many others) defaults to
    // semicolon-delimited CSV on import, so a plain comma-joined file opens as a single column.
    const csv = 'sep=,\n' + [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allStudents.filter(s => {
      if (q && !s.name.toLowerCase().includes(q) && !s.phone.toLowerCase().includes(q)) return false
      if (branchFilter && s.branchId?._id !== branchFilter) return false
      if (languageFilter && !currentCourses(s).some(c => c.languageId?._id === languageFilter)) return false
      if (levelFilter && !currentCourses(s).some(c => c.levelId?._id === levelFilter)) return false
      return true
    })
  }, [allStudents, search, branchFilter, languageFilter, levelFilter])

  return (
    <div>
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4'>
        <div className='flex items-baseline gap-3'>
          <p className='font-display text-2xl text-ink'>{t('allStudentsTitle')}</p>
          <span className='text-sm font-medium text-muted'>{visibleStudents.length}</span>
        </div>
        <button onClick={exportStudentsCSV} className='px-4 py-2 rounded-xl bg-bg-elevated border border-hairline text-muted hover:text-ink hover:border-accent/30 text-sm font-medium flex items-center gap-1.5 transition-colors'>
          <Download size={14} /> {t('exportBtn')}
        </button>
      </div>

      <div className='flex flex-wrap gap-3 mb-4'>
        <div className='relative flex-1 max-w-sm min-w-[10rem]'>
          <Search size={16} strokeWidth={2} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none' />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchStudents')}
            className='w-full pl-10 pr-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm focus:outline-none focus:ring-2 focus:ring-accent/30' />
        </div>
        <Select className='w-44' value={branchFilter} onChange={setBranchFilter} placeholder={t('anyBranch')}
          options={[{ value: '', label: t('anyBranch') }, ...branches.map(b => ({ value: b._id, label: b.name }))]} />
        <Select className='w-44' value={languageFilter} onChange={(v) => { setLanguageFilter(v); if (v) getLevels(v) }} placeholder={t('anyLanguage')}
          options={[{ value: '', label: t('anyLanguage') }, ...languages.map(l => ({ value: l._id, label: l.name }))]} />
        <Select className='w-44' value={levelFilter} onChange={setLevelFilter} placeholder={t('anyLevel')}
          options={[{ value: '', label: t('anyLevel') }, ...levels.map(l => ({ value: l._id, label: l.name }))]} />
        {(search || branchFilter || languageFilter || levelFilter) && (
          <button onClick={() => { setSearch(''); setBranchFilter(''); setLanguageFilter(''); setLevelFilter('') }} className='text-muted hover:text-ink text-sm transition-colors'>{t('clear')}</button>
        )}
      </div>

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden overflow-x-auto shadow-sm'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>{t('nameCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('phoneCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('branch')}</th>
              <th className='px-5 py-3 font-medium'>{t('coursesCol')}</th>
              <th className='px-5 py-3 font-medium'>{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map(s => (
              <tr key={s._id} onClick={() => navigate('/students/' + s._id)} className='border-b border-hairline last:border-0 cursor-pointer transition-colors hover:bg-bg'>
                <td className='px-5 py-4 text-ink'>
                  <span className='flex items-center gap-2.5'>
                    <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(s.name)} flex items-center justify-center flex-shrink-0 text-white font-semibold text-[11px]`}>
                      {initials(s.name)}
                    </span>
                    <span className='font-medium'>{s.name}</span>
                  </span>
                </td>
                <td className='px-5 py-4 text-muted font-mono'>{s.phone}</td>
                <td className='px-5 py-4 text-muted'>{s.branchId?.name}</td>
                <td className='px-5 py-4 text-muted'>{courseSummary(s)}</td>
                <td className='px-5 py-4'>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${anyActive(s) ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>
                    {anyActive(s) ? t('active') : t('unpaid')}
                  </span>
                </td>
              </tr>
            ))}
            {visibleStudents.length === 0 && (
              <tr><td colSpan={5} className='px-5 py-8 text-center text-muted'>{allStudents.length === 0 ? t('noStudentsYetPlain') : t('noStudentsMatchFilters')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {visibleStudents.length === 0 && (
          <p className='text-muted text-sm text-center py-8'>{allStudents.length === 0 ? t('noStudentsYetPlain') : t('noStudentsMatchFilters')}</p>
        )}
        {visibleStudents.map(s => (
          <button key={s._id} onClick={() => navigate('/students/' + s._id)}
            className='plain bg-bg-elevated border border-hairline rounded-xl p-3.5 shadow-sm text-left w-full flex items-center gap-3'>
            <span className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGradient(s.name)} flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm shadow-sm`}>
              {initials(s.name)}
            </span>
            <div className='min-w-0 flex-1'>
              <div className='flex justify-between items-start gap-2'>
                <p className='text-ink font-semibold text-sm truncate'>{s.name}</p>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${anyActive(s) ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>
                  {anyActive(s) ? t('active') : t('unpaid')}
                </span>
              </div>
              <p className='text-muted text-xs mt-0.5 font-mono'>{s.phone} · {s.branchId?.name}</p>
              <div className='flex flex-wrap gap-1 mt-1.5'>
                {courseTags(s).length > 0 ? courseTags(s).map((name, i) => (
                  <span key={i} className='text-[11px] font-medium px-2 py-0.5 rounded-full bg-bg text-muted'>{name}</span>
                )) : <span className='text-[11px] text-muted'>—</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Students
