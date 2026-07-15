import React, { useContext, useState } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import Logo from '../components/Logo.jsx'

const Login = () => {
  const { login } = useContext(AdminContext)
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
    <div className='min-h-screen flex items-center justify-center'>
      <form onSubmit={onSubmit} className='w-full max-w-sm bg-bg-elevated border border-hairline rounded-2xl p-8'>
        <div className='mb-1'><Logo size={30} /></div>
        <p className='text-muted mb-6 ml-10'>branch front-desk console</p>
        <input type='tel' placeholder='Phone number' value={phone} onChange={(e) => setPhone(e.target.value)}
          className='w-full px-4 py-3 rounded-xl bg-bg border border-hairline text-ink placeholder:text-muted mb-3' required />
        <input type='password' placeholder='Password' value={password} onChange={(e) => setPassword(e.target.value)}
          className='w-full px-4 py-3 rounded-xl bg-bg border border-hairline text-ink placeholder:text-muted mb-4' required />
        <button type='submit' disabled={loading} className='w-full py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-60'>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

export default Login
