import React from 'react'

// groups the integer part with commas as you type ("100000000" reads as "100,000,000") so a large
// price/quantity is legible at a glance instead of needing to count digits. `value`/`onChange`
// still behave like a plain numeric input's - both carry the raw, comma-free numeric string; only
// the on-screen display is formatted. A real <input type='number'> can't do this (the browser
// strips anything that isn't a valid number, commas included), so this is a text input underneath.
const formatWithCommas = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return ''
  const [intPart, decPart] = String(raw).split('.')
  const sign = intPart.startsWith('-') ? '-' : ''
  const digits = sign ? intPart.slice(1) : intPart
  const formattedInt = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart !== undefined ? `${sign}${formattedInt}.${decPart}` : `${sign}${formattedInt}`
}

const NumberInput = ({ value, onChange, className = '', ...props }) => {
  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, '')
    if (raw === '' || raw === '-' || /^-?\d*\.?\d*$/.test(raw)) onChange(raw)
  }
  return (
    <input type='text' inputMode='decimal' value={formatWithCommas(value)} onChange={handleChange} className={className} {...props} />
  )
}

export default NumberInput
