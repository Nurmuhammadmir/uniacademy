import React, { useContext, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { StudentContext } from '../context/StudentContext.jsx'

const SCANNER_ELEMENT_ID = 'attendance-qr-reader'

// full-screen camera scanner - opens the device camera, decodes a QR the moment it's in frame,
// posts the token to the backend, then shows a clear success/already-marked/failure state.
// BUG FIX: html5-qrcode throws "Cannot stop, scanner is not running or paused" if .stop() is
// called when it isn't actually in a running/paused state (e.g. calling it twice, or on unmount
// after it already stopped itself). A ref tracks the real running state so we only ever call
// .stop() when it's genuinely safe to.
const AttendanceScanner = ({ onClose }) => {
  const { scanAttendance } = useContext(StudentContext)
  const scannerRef = useRef(null)
  const runningRef = useRef(false)
  const processingRef = useRef(false)
  const [status, setStatus] = useState('scanning') // scanning | checking | success | already | error
  const [cameraError, setCameraError] = useState(null)

  const safeStop = async () => {
    if (!runningRef.current || !scannerRef.current) return
    try {
      await scannerRef.current.stop()
    } catch (error) {
      // already stopped/never started - nothing to do
    }
    runningRef.current = false
  }

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      async (decodedText) => {
        if (processingRef.current) return
        processingRef.current = true
        setStatus('checking')
        await safeStop()
        const result = await scanAttendance(decodedText)
        if (!result.ok) { setStatus('error'); return }
        setStatus(result.alreadyMarked ? 'already' : 'success')
      },
      () => {} // ignore per-frame "no QR found" noise
    ).then(() => {
      runningRef.current = true
    }).catch((err) => setCameraError(String(err)))

    return () => {
      safeStop().then(() => {
        scannerRef.current?.clear().catch(() => {})
      })
    }
  }, [])

  return (
    <div className='fixed inset-0 bg-black z-50 flex flex-col'>
      <div className='flex items-center justify-between px-5 pt-6 pb-4'>
        <button onClick={onClose} className='text-white text-sm'>Close</button>
        <p className='font-display text-white'>Scan attendance</p>
        <span className='w-10' />
      </div>

      <div className='flex-1 flex items-center justify-center px-6'>
        {status === 'scanning' && (
          <div className='w-full max-w-xs'>
            <div id={SCANNER_ELEMENT_ID} className='rounded-2xl overflow-hidden' />
            {cameraError && <p className='text-white text-sm text-center mt-4'>Couldn't access the camera - check your browser's camera permission.</p>}
            {!cameraError && <p className='text-white/70 text-sm text-center mt-4'>Point your camera at your teacher's QR code</p>}
          </div>
        )}

        {status === 'checking' && <p className='text-white'>Checking in…</p>}

        {status === 'success' && (
          <div className='text-center'>
            <span className='text-6xl block mb-3'>✅</span>
            <p className='text-white font-display text-xl mb-6'>You're checked in!</p>
            <button onClick={onClose} className='px-6 py-3 rounded-2xl bg-accent text-white font-medium'>Done</button>
          </div>
        )}

        {status === 'already' && (
          <div className='text-center'>
            <span className='text-6xl block mb-3'>👍</span>
            <p className='text-white font-display text-xl mb-6'>Already checked in today</p>
            <button onClick={onClose} className='px-6 py-3 rounded-2xl bg-accent text-white font-medium'>Done</button>
          </div>
        )}

        {status === 'error' && (
          <div className='text-center'>
            <span className='text-6xl block mb-3'>⚠️</span>
            <p className='text-white font-display text-xl mb-6'>Couldn't check you in</p>
            <button onClick={onClose} className='px-6 py-3 rounded-2xl bg-accent text-white font-medium'>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AttendanceScanner
