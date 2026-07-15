import React, { useContext } from 'react'
import { resolveImageUrl } from '../lib/format.js'
import { StudentContext } from '../context/StudentContext.jsx'

const QuestionCard = ({ index, question, options, value, onChange, type }) => {
  const { backendUrl } = useContext(StudentContext)
  const hasOptions = Array.isArray(options) && options.length > 0
  // true_false questions never carry an options array (they're a fixed binary choice), so they'd
  // otherwise fall through to the free-text input below - which mismatches the boolean `correct`
  // value stored in the DB the moment a student types anything. Render explicit buttons instead,
  // with plain lowercase string values ('true'/'false') that the backend compares as strings too.
  const isTrueFalse = type === 'true_false'

  return (
    <div className='bg-bg-card border border-hairline rounded-2xl p-4 mb-3'>
      <p className='text-xs font-mono text-muted mb-2'>Q{index + 1}</p>
      <p className='text-ink font-medium mb-3'>{question}</p>

      {isTrueFalse ? (
        <div className='grid grid-cols-2 gap-2'>
          {['true', 'false'].map(v => (
            <button
              key={v}
              type='button'
              onClick={() => onChange(v)}
              className={`rounded-xl border px-4 py-3 capitalize ${value === v ? 'border-accent bg-accent-soft' : 'border-hairline bg-bg-elevated'}`}
            >
              {v}
            </button>
          ))}
        </div>
      ) : hasOptions ? (
        <div className={`grid gap-2 ${options[0]?.image ? 'grid-cols-2' : ''}`}>
          {options.map((option, i) => {
            const optionValue = typeof option === 'object' ? option._id : option
            const selected = value === optionValue
            const baseClasses = `rounded-xl border ${selected ? 'border-accent bg-accent-soft' : 'border-hairline bg-bg-elevated'}`

            if (option && typeof option === 'object' && option.image) {
              return (
                <button key={i} type='button' onClick={() => onChange(optionValue)} className={`${baseClasses} p-2 text-left`}>
                  <img src={resolveImageUrl(option.image, backendUrl)} alt={option.category} className='w-full h-20 object-cover rounded-lg mb-1' />
                  <span className='text-xs text-muted'>{option.category}</span>
                </button>
              )
            }

            const optionLabel = typeof option === 'object' ? (option.word || option.text || JSON.stringify(option)) : option
            return (
              <button key={i} type='button' onClick={() => onChange(optionValue)} className={`${baseClasses} text-left px-4 py-3 col-span-2`}>
                {optionLabel}
              </button>
            )
          })}
        </div>
      ) : (
        <input
          type='text'
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder='Type your answer'
          className='w-full px-4 py-3 rounded-xl border border-hairline bg-bg-elevated text-ink'
        />
      )}
    </div>
  )
}

export default QuestionCard
