import React, { useContext, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { AdminContext } from '../context/AdminContext.jsx'

const Teachers = () => {
  const { teachers, teacherAttendanceQRs, createTeacherAttendanceQR } = useContext(AdminContext)
  const [showingId, setShowingId] = useState(teacherAttendanceQRs[0]?._id || null)

  const generate = async () => {
    const data = await createTeacherAttendanceQR()
    if (data) setShowingId(data.qr._id)
  }

  const showing = teacherAttendanceQRs.find(q => q._id === showingId) || teacherAttendanceQRs[0]

  return (
    <div>
      <p className='font-display text-2xl text-ink mb-1'>Teachers</p>
      <p className='text-muted mb-6'>every teacher in your branch checks in with the SAME shared QR - print it once and leave it at the front desk</p>

      <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 mb-8 flex flex-col items-center max-w-sm'>
        {showing ? (
          <>
            <div className='bg-white p-4 rounded-2xl'>
              <QRCodeSVG value={showing.token} size={220} bgColor='#ffffff' fgColor='#231F1A' level='M' />
            </div>
            <p className='text-muted text-xs mt-3 text-center'>
              Never expires - any teacher scans this to check in. Generated {new Date(showing.createdAt).toLocaleDateString()}.
            </p>
          </>
        ) : (
          <p className='text-muted text-center'>No check-in QR generated yet for this branch.</p>
        )}
        <button onClick={generate} className='mt-4 px-5 py-2 rounded-xl bg-accent text-white text-sm font-medium'>
          {showing ? 'Generate another' : 'Generate check-in QR'}
        </button>

        {teacherAttendanceQRs.length > 1 && (
          <div className='flex flex-wrap gap-2 mt-4 justify-center'>
            {teacherAttendanceQRs.map((q, i) => (
              <button
                key={q._id}
                onClick={() => setShowingId(q._id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${q._id === showing?._id ? 'bg-accent text-white' : 'bg-bg border border-hairline text-muted'}`}
              >
                Code {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className='bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-muted border-b border-hairline'>
              <th className='px-5 py-3 font-medium'>Name</th>
              <th className='px-5 py-3 font-medium'>Phone</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map(t => (
              <tr key={t._id} className='border-b border-hairline last:border-0'>
                <td className='px-5 py-3 text-ink'>{t.name}</td>
                <td className='px-5 py-3 text-muted font-mono'>{t.phone}</td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={2} className='px-5 py-8 text-center text-muted'>No teachers in this branch yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Teachers
