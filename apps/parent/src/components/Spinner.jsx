import React from 'react'

// tiny inline spinner - border-current so it inherits whatever text color it's placed in (white on
// a colored button, muted on plain text), no extra color prop needed at each call site
const Spinner = ({ size = 16, className = '' }) => (
  <span
    className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin align-[-2px] ${className}`}
    style={{ width: size, height: size }}
  />
)

export default Spinner
