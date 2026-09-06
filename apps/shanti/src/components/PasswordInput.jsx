import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const PasswordInput = ({ className = '', ...inputProps }) => {
  const [visible, setVisible] = useState(false)
  return (
    <div className='relative'>
      <input type={visible ? 'text' : 'password'} className={`${className} pr-11`} {...inputProps} />
      <button type='button' tabIndex={-1} onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        className='plain absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer'>
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  )
}

export default PasswordInput
