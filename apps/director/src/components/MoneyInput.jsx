import React from 'react'

// a money-amount input that shows comma thousand-separators as the user types (typing "5000000"
// reads instantly as "5,000,000" instead of a hard-to-count block of digits - a real complaint:
// miscounting zeros on a 6-7 digit so'm amount is an easy, costly mistake). The value handed to
// onChange is always the plain, comma-free digit string - every existing caller (Number(form.amount),
// straight into an API body) keeps working completely unchanged; only the `type='number'` ->
// `<MoneyInput>` swap and the import are needed at each call site. Digits only, no decimal/minus -
// matches every money amount already stored as a whole number throughout this app.
const digitsOnly = (s) => String(s ?? '').replace(/[^\d]/g, '')

const MoneyInput = ({ value, onChange, className = '', ...rest }) => {
  const clean = digitsOnly(value)
  const display = clean === '' ? '' : clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  const handleChange = (e) => onChange({ target: { value: digitsOnly(e.target.value) } })

  return (
    <input type='text' inputMode='numeric' autoComplete='off' value={display} onChange={handleChange} className={className} {...rest} />
  )
}

export default MoneyInput
