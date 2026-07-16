import React from 'react'

// shared result panel for the vocab word bank and grammar bank - same shape, different unit noun
const BankFillResult = ({ daysFilled, used, remaining, emptyDaysRemaining, filled, skipped, unitLabel }) => {
  if (daysFilled === undefined) return null
  return (
    <div className='bg-accent-soft rounded-xl p-3 text-sm text-ink flex flex-col gap-1'>
      <p>Filled <span className='font-mono'>{daysFilled}</span> day{daysFilled === 1 ? '' : 's'} using <span className='font-mono'>{used}</span> {unitLabel}{used === 1 ? '' : 's'}.</p>
      {remaining > 0 && <p className='text-muted'>{remaining} {unitLabel}{remaining === 1 ? '' : 's'} left over - no empty days remained to put them in.</p>}
      {emptyDaysRemaining > 0 && <p className='text-muted'>{emptyDaysRemaining} day{emptyDaysRemaining === 1 ? '' : 's'} still empty - the bank ran out first.</p>}
      {filled?.length > 0 && (
        <p className='text-muted font-mono text-xs'>Days: {filled.map(f => `${f.day} (${f.count})`).join(', ')}</p>
      )}
      {skipped?.length > 0 && (
        <div className='mt-1 pt-2 border-t border-hairline/50'>
          <p className='text-ink'>{skipped.length} skipped as duplicate{skipped.length === 1 ? '' : 's'}:</p>
          <div className='max-h-32 overflow-y-auto mt-1 flex flex-col gap-0.5'>
            {skipped.map((s, i) => (
              <p key={i} className='text-muted text-xs'><span className='text-ink'>{s.text}</span> - {s.reason}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default BankFillResult
