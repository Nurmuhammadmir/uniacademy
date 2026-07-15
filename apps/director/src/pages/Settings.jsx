import React, { useContext } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'

const Settings = () => {
  const { settings, updateSettings } = useContext(DirectorContext)

  if (!settings) return <p className='text-muted'>Loading settings…</p>

  return (
    <div>
      <p className='font-display text-2xl text-ink mb-6'>Settings</p>

      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 max-w-lg'>
        <div className='flex justify-between items-center'>
          <div>
            <p className='text-ink font-medium'>Require passport info for new students</p>
            <p className='text-muted text-sm mt-1'>When on, an admin can't register a student without entering their passport/ID details. Defaults to on.</p>
          </div>
          <button
            onClick={() => updateSettings({ passportRequired: !settings.passportRequired })}
            className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${settings.passportRequired ? 'bg-accent' : 'bg-hairline'}`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${settings.passportRequired ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
