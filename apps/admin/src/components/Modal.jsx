import React from 'react'

const Modal = ({ title, onClose, children, wide }) => {
  return (
    <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4'>
      <div className={`bg-bg-elevated border border-hairline rounded-2xl p-6 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto`}>
        <div className='flex justify-between items-center mb-4'>
          <p className='font-display text-lg text-ink'>{title}</p>
          <button onClick={onClose} className='text-muted text-xl leading-none'>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal
