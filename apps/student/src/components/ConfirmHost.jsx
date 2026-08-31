import React, { useEffect, useState } from 'react'
import { registerConfirmListener } from '../lib/confirm.js'

// mounted once near the app root - listens for confirm() calls from anywhere (contexts included)
// and renders a real modal instead of window.confirm()
const ConfirmHost = () => {
  const [request, setRequest] = useState(null)

  useEffect(() => {
    registerConfirmListener((req) => setRequest(req))
  }, [])

  if (!request) return null

  const handle = (result) => {
    request.resolve(result)
    setRequest(null)
  }

  return (
    <div className='fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center px-4'>
      <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 w-full max-w-sm'>
        <p className='text-ink font-medium mb-2'>Are you sure?</p>
        <p className='text-muted text-sm mb-5'>{request.message}</p>
        <div className='flex gap-3'>
          <button onClick={() => handle(false)} className='flex-1 py-3 rounded-xl border border-hairline text-muted font-medium'>Cancel</button>
          <button onClick={() => handle(true)} className='flex-1 py-3 rounded-xl bg-accent text-white font-medium'>Confirm</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmHost
