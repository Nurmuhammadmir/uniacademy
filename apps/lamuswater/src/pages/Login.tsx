import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth, type Role } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { Droplets, Eye, EyeOff } from 'lucide-react'
import LanguageSwitcher from '../components/LanguageSwitcher'

const Login = () => {
  const { login } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('manager')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await login(email, password, role)
    setLoading(false)
    if (result.success) {
      navigate('/dashboard')
    } else {
      toast.error(result.message || t('login.loginFailed'))
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-[42%] flex-col justify-between bg-[#0066CC] p-12 relative overflow-hidden">
        {/* subtle pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Droplets className="text-white" size={28} strokeWidth={1.5} />
              <span className="font-display text-white text-2xl italic tracking-wide">Lamus</span>
            </div>
            <p className="text-blue-200 text-sm mt-1 tracking-widest uppercase font-light">{t('login.tagline')}</p>
          </div>
          <LanguageSwitcher dark />
        </div>
        <div className="relative z-10">
          <blockquote className="text-white/80 text-lg font-light leading-relaxed mb-8 font-display italic">
            {t('login.quoteLine1')}<br />{t('login.quoteLine2')}
          </blockquote>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t('login.statActiveClients'), value: '5' },
              { label: t('login.statBottlesOut'), value: '16' },
              { label: t('login.statDeliveriesToday'), value: '3' },
              { label: t('login.statManagers'), value: '2' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4">
                <div className="font-mono-data text-white text-2xl font-medium">{stat.value}</div>
                <div className="text-blue-200 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white relative">
        <div className="absolute top-6 right-6 lg:hidden">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <Droplets className="text-[#0066CC]" size={22} strokeWidth={1.5} />
            <span className="font-display text-[#0066CC] text-xl italic">Lamus</span>
          </div>

          <h1 className="text-2xl font-display text-gray-900 mb-1">{t('login.welcomeBack')}</h1>
          <p className="text-gray-400 text-sm mb-8">{t('login.signInPrompt')}</p>

          {/* Role toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            {(['manager', 'admin'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 capitalize
                  ${role === r ? 'bg-white text-[#0066CC] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {r === 'admin' ? t('login.admin') : t('login.manager')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('common.email')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={role === 'admin' ? 'admin@lamus.com' : 'manager@lamus.com'}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300
                  focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">{t('common.password')}</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300
                    focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/10 transition-all pr-12"
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0066CC] text-white py-3 rounded-lg text-sm font-medium mt-2
                hover:bg-[#0052A3] active:bg-[#003D7A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
