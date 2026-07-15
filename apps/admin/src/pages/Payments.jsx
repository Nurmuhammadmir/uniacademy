import React, { useContext } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import { formatMoney } from '../lib/format.js'

const Payments = () => {
  const { payments, students, deletePayment } = useContext(AdminContext)
  const nameById = Object.fromEntries(students.map(s => [s._id, s.name]))

  return (
    <div>
      <p className='font-display text-2xl text-ink mb-6'>Payments</p>
      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>Student</th>
              <th className='px-5 py-3 font-medium'>Course</th>
              <th className='px-5 py-3 font-medium'>Amount</th>
              <th className='px-5 py-3 font-medium'>Date</th>
              <th className='px-5 py-3 font-medium'>Subscription until</th>
              <th className='px-5 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p._id} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-3 text-ink'>{nameById[p.studentId] || p.studentId}</td>
                <td className='px-5 py-3 text-muted'>{p.languageId?.name || '—'}</td>
                <td className='px-5 py-3 font-mono text-ink'>{formatMoney(p.amount)}</td>
                <td className='px-5 py-3 text-muted'>{new Date(p.date).toLocaleDateString()}</td>
                <td className='px-5 py-3 text-muted font-mono text-xs'>{p.subscriptionEnd ? new Date(p.subscriptionEnd).toLocaleDateString() : '—'}</td>
                <td className='px-5 py-3 text-right'>
                  <button onClick={() => deletePayment(p._id)} className='text-muted text-xs font-medium'>Void</button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={6} className='px-5 py-8 text-center text-muted'>No payments recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Payments
