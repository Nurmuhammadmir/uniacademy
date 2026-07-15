import React, { useContext, useEffect, useState } from 'react'
import { StudentContext } from '../context/StudentContext.jsx'

const dayScore = (row) => {
  const scores = [row?.vocabScore, row?.grammarScore, row?.readingScore].filter(s => s !== null && s !== undefined)
  if (scores.length === 0) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

const Ranking = () => {
  const { getGroupRanking, getGroupProgress } = useContext(StudentContext)
  const [ranking, setRanking] = useState(false)
  const [groupProgress, setGroupProgress] = useState(false)

  useEffect(() => {
    getGroupRanking().then(setRanking)
    getGroupProgress().then(setGroupProgress)
  }, [])

  if (!ranking || !groupProgress) return <div className='px-6 pt-16 text-muted'>Loading ranking…</div>

  const scoreByStudent = Object.fromEntries(ranking.ranking.map(r => [r.studentId, r.averageScore]))
  const sortedRoster = [...groupProgress.roster].sort((a, b) => (scoreByStudent[b.studentId] ?? -1) - (scoreByStudent[a.studentId] ?? -1))
  const dayCount = groupProgress.groupDayCounter

  return (
    <div className='px-5 pt-10'>
      <p className='font-display text-2xl text-ink mb-1'>Level ranking</p>
      <p className='text-ink text-sm font-medium mb-1'>
        {groupProgress.group?.language} · {groupProgress.group?.level} · {groupProgress.group?.teacher} · {groupProgress.group?.schedulePattern?.replaceAll('_', '/')} {groupProgress.group?.time}
      </p>
      <p className='text-muted mb-1'>you're #{ranking.myRank || '—'} in your group</p>
      <p className='text-muted text-xs mb-6'>overall average across this whole level so far, not just today</p>

      <div className='flex flex-col gap-2 mb-8'>
        {sortedRoster.map((student, i) => {
          const isMe = String(student.studentId) === ranking.myId
          const isFirst = i === 0 && scoreByStudent[student.studentId] !== undefined
          return (
            <div key={student.studentId} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${isMe ? 'border-accent bg-accent-soft' : isFirst ? 'border-gold bg-gold-soft' : 'border-hairline bg-bg-card'}`}>
              <span className='flex items-center gap-3'>
                {isFirst ? (
                  <span className='w-5 h-5 rounded-full bg-gold text-white flex items-center justify-center text-xs'>🏆</span>
                ) : (
                  <span className='font-mono text-muted text-sm w-5'>{i + 1}</span>
                )}
                <span className='text-ink font-medium'>{isMe ? 'You' : student.name}</span>
              </span>
              <span className={`font-mono text-sm ${isFirst ? 'text-gold' : 'text-accent'}`}>{scoreByStudent[student.studentId] ?? '—'}%</span>
            </div>
          )
        })}
        {sortedRoster.length === 0 && <p className='text-muted text-sm'>No students in your group yet.</p>}
      </div>

      <p className='text-ink font-medium mb-3'>Day-by-day, everyone</p>
      <div className='bg-bg-card border border-hairline rounded-2xl p-4 overflow-x-auto'>
        <table className='text-sm border-separate' style={{ borderSpacing: '4px 6px' }}>
          <thead>
            <tr>
              <th className='sticky left-0 bg-bg-card text-left text-muted font-medium pr-3'>Student</th>
              {Array.from({ length: dayCount }, (_, i) => i + 1).map(d => (
                <th key={d} className='text-muted font-mono font-medium text-xs w-8'>{d}</th>
              ))}
              <th className='text-muted font-medium pl-3'>Avg</th>
            </tr>
          </thead>
          <tbody>
            {sortedRoster.map(student => {
              const isMe = String(student.studentId) === ranking.myId
              return (
                <tr key={student.studentId}>
                  <td className={`sticky left-0 bg-bg-card pr-3 whitespace-nowrap ${isMe ? 'text-accent font-medium' : 'text-ink'}`}>
                    {isMe ? 'You' : student.name}
                  </td>
                  {Array.from({ length: dayCount }, (_, i) => i + 1).map(d => {
                    const row = student.days.find(r => r.day === d)
                    const score = dayScore(row)
                    const bg = row?.status === 'done' ? 'bg-gold text-white' : row?.status === 'expired' ? 'bg-red-100 text-red-500' : 'bg-hairline text-muted'
                    return (
                      <td key={d} className='text-center'>
                        <span className={`inline-flex w-8 h-6 items-center justify-center rounded-md text-[10px] font-mono ${bg}`}>
                          {score !== null ? score : '·'}
                        </span>
                      </td>
                    )
                  })}
                  <td className='pl-3 font-mono text-accent'>{scoreByStudent[student.studentId] ?? '—'}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Ranking
