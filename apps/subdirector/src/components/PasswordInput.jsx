import React, { useState } from 'react'

// wraps a plain password input with a show/hide toggle - the wrapper stays unpositioned
// (no width/margin classes of its own) so it never disturbs the surrounding form's layout,
// it just needs `relative` so the toggle button can pin itself inside the input
const PasswordInput = ({ className = '', ...inputProps }) => {
  const [visible, setVisible] = useState(false)
  return (
    <div className='relative'>
      <input type={visible ? 'text' : 'password'} className={`${className} pr-11`} {...inputProps} />
      <button type='button' tabIndex={-1} onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className='absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm'>
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  )
}

export default PasswordInput
