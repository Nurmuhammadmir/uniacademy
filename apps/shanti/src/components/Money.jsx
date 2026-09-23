import { formatMoney } from '../lib/format.js'

// thins/enlarges the trailing $ relative to the (now bold, see the table money columns) digits -
// plain "1,234$" reads as one blurry blob, this keeps the currency mark legible next to the number
const Money = ({ value }) => {
  const formatted = formatMoney(value)
  if (formatted === '—') return '—'
  return <>{formatted.slice(0, -1)}<span className='font-thin text-[1.15em]'>$</span></>
}

export default Money
