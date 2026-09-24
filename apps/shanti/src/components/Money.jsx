import { formatMoney, formatPrice } from '../lib/format.js'

// thins/enlarges the trailing $ relative to the (now bold, see the table money columns) digits -
// plain "1,234$" reads as one blurry blob, this keeps the currency mark legible next to the number.
// `precise` keeps cents instead of rounding to whole dollars - for per-unit prices (see formatPrice)
const Money = ({ value, precise }) => {
  const formatted = (precise ? formatPrice : formatMoney)(value)
  if (formatted === '—') return '—'
  return <>{formatted.slice(0, -1)}<span className='font-thin text-[1.15em]'>$</span></>
}

export default Money
