import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { todayISO } from '../lib/date.js'

const Timetable = () => {
  const { branches, getTimetable } = useContext(DirectorContext)
  const { t } = useLanguage()

  const [branchId, setBranchId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!branchId && branches.length > 0) setBranchId(branches[0]._id)
  }, [branches])

  useEffect(() => {
    if (branchId) getTimetable(branchId, date).then(setData)
  }, [branchId, date])

  const timeSlots = data
    ? [...new Set(data.lessons.map(l => `${l.startTime}-${l.endTime}`))].sort()
    : []

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <p className='font-display text-2xl text-ink'>{t('navTimetable')}</p>
        <div className='flex gap-2 items-center'>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className='px-3 py-2 rounded-xl bg-bg-elevated border border-hairline text-sm'>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <input type='date' value={date} onChange={e => setDate(e.target.value)} className='px-3 py-2 rounded-xl bg-bg-elevated border border-hairline text-sm' />
        </div>
      </div>

      {!branchId ? <p className='text-muted'>{t('noBranchesYet')}</p> : !data ? <p className='text-muted'>{t('loading')}</p> : data.rooms.length === 0 ? (
        <p className='text-muted'>{t('noRoomsYet')}</p>
      ) : timeSlots.length === 0 ? (
        <p className='text-muted'>{t('noLessonsThisDay')}</p>
      ) : (
        <div className='overflow-x-auto bg-bg-elevated border border-hairline rounded-2xl'>
          <table className='text-sm border-collapse w-full'>
            <thead>
              <tr>
                <th className='px-3 py-2 text-left text-muted font-medium border-b border-hairline whitespace-nowrap'>{t('timeCol')}</th>
                {data.rooms.map(r => (
                  <th key={r._id} className='px-3 py-2 text-left text-muted font-medium border-b border-hairline whitespace-nowrap'>{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(slot => (
                <tr key={slot}>
                  <td className='px-3 py-2 text-ink font-mono text-xs border-b border-hairline whitespace-nowrap'>{slot}</td>
                  {data.rooms.map(r => {
                    const lesson = data.lessons.find(l => `${l.startTime}-${l.endTime}` === slot && String(l.roomId) === String(r._id))
                    return (
                      <td key={r._id} className='px-3 py-2 border-b border-hairline whitespace-nowrap'>
                        {lesson ? (
                          <div>
                            <p className='text-ink font-medium'>{lesson.name || `${lesson.language} · ${lesson.level}`}</p>
                            <p className='text-muted text-xs'>{lesson.teacher}</p>
                          </div>
                        ) : <span className='text-muted'>—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Timetable
