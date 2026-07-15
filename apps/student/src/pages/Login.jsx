import React, { useContext, useState } from 'react'
import { StudentContext } from '../context/StudentContext.jsx'
import Logo from '../components/Logo.jsx'

const Login = () => {
  const { login } = useContext(StudentContext)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await login(phone, password)
    setLoading(false)
  }

  return (
    <div className='min-h-screen flex flex-col justify-center px-6'>
      <div className='mb-1'><Logo size={40} /></div>
      <p className='text-muted mb-8 ml-[50px]'>sign in to continue your course</p>

      <form onSubmit={onSubmit} className='flex flex-col gap-4'>
        <input type='tel' inputMode='tel' placeholder='Phone number' value={phone} onChange={(e) => setPhone(e.target.value)}
          className='w-full px-4 py-4 rounded-2xl bg-bg-elevated border border-hairline text-ink placeholder:text-muted' required />
        <input type='password' placeholder='Password' value={password} onChange={(e) => setPassword(e.target.value)}
          className='w-full px-4 py-4 rounded-2xl bg-bg-elevated border border-hairline text-ink placeholder:text-muted' required />
        <button type='submit' disabled={loading} className='w-full py-4 rounded-2xl bg-accent text-white font-medium text-base disabled:opacity-60'>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

export default Login
