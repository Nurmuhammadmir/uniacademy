import React, { useContext } from 'react'
import { StudentContext } from '../context/StudentContext.jsx'
import { groupLabel } from '../lib/format.js'

// a student can be in more than one active group at once - only worth showing a switcher once
// there's actually a choice to make. Shared across every page that reads selectedGroupId-scoped
// data (Today/Profile/Progress/Ranking) so switching groups on any one of them stays in sync everywhere.
const GroupSwitcher = () => {
  const { myGroups, selectedGroupId, setSelectedGroupId } = useContext(StudentContext)
  if (myGroups.length <= 1) return null

  return (
    <div className='flex gap-2 overflow-x-auto mb-3 pb-1'>
      {myGroups.map(g => (
        <button
          key={g._id}
          onClick={() => setSelectedGroupId(g._id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${g._id === selectedGroupId ? 'bg-accent text-white' : 'bg-bg-card border border-hairline text-muted'}`}
        >
          {groupLabel(g)}
        </button>
      ))}
    </div>
  )
}

export default GroupSwitcher
