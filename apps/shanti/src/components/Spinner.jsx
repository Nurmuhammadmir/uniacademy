import React from 'react'

const Spinner = ({ size = 16, className = '' }) => (
  <span
    className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin align-[-2px] ${className}`}
    style={{ width: size, height: size }}
  />
)

export default Spinner
