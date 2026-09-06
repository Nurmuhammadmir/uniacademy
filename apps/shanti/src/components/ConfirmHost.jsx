import React, { useEffect, useState } from 'react'
import { registerConfirmListener } from '../lib/confirm.js'

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
    <div className='fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-md transition-all duration-300 flex items-center justify-center p-4'>
      <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 w-full max-w-sm'>
        <p className='text-ink font-medium mb-2'>Вы уверены?</p>
        <p className='text-muted text-sm mb-5'>{request.message}</p>
        <div className='flex gap-3'>
          <button onClick={() => handle(false)} className='flex-1 py-3 rounded-xl border border-hairline text-muted font-medium'>Отмена</button>
          <button onClick={() => handle(true)} className='flex-1 py-3 rounded-xl bg-accent text-white font-medium'>Подтвердить</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmHost
