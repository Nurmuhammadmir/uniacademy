import React from 'react'

const Modal = ({ title, onClose, children, wide }) => {
  return (
    <div className='fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4'>
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
