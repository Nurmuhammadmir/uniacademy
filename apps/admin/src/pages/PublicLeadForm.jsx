import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { CheckCircle2 } from 'lucide-react'
import Spinner from '../components/Spinner.jsx'
import Select from '../components/Select.jsx'
import Logo from '../components/Logo.jsx'

// fully public, unauthenticated page - anyone with the link lands here with no admin session at
// all, so this talks to the backend directly rather than through AdminContext (which assumes a
// logged-in admin and would redirect to Login on any 401). No LanguageContext here for the same
// reason - copy is hardcoded Uzbek, this platform's default audience-facing language.
const backendUrl = import.meta.env.VITE_BACKEND_URL
const LABEL = 'text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block'
const FIELD = 'w-full bg-[#f5f5f7] focus:bg-white border border-transparent focus:border-accent rounded-xl py-3 px-4 text-sm text-[#1D1D1F] placeholder:text-slate-400 focus:ring-4 focus:ring-accent/10 transition-all outline-none'

const PublicLeadForm = () => {
  const { slug } = useParams()
  const [form, setForm] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [values, setValues] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(backendUrl + '/api/public/leads-form/' + slug)
      .then(({ data }) => setForm(data.form))
      .catch(() => setNotFound(true))
  }, [slug])

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const answers = {}
      form.fields.forEach(f => { if (!['name', 'phone', 'comment'].includes(f.key)) answers[f.key] = values[f.key] || '' })
      await axios.post(backendUrl + `/api/public/leads-form/${slug}/submit`, {
        name: values.name || '', phone: values.phone || '', comment: values.comment || '', answers,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error === 'missing_required_field' ? "Barcha majburiy maydonlarni to'ldiring." : "Xatolik yuz berdi, qaytadan urinib ko'ring.")
    }
    setSubmitting(false)
  }

  const PAGE = 'min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30 flex flex-col items-center justify-center p-4'

  if (notFound) return <div className={PAGE}><p className='text-slate-400 text-sm'>Bu forma mavjud emas.</p></div>
  if (!form) return <div className={PAGE}><p className='text-slate-400 text-sm'>Yuklanmoqda…</p></div>

  if (submitted) {
    return (
      <div className={PAGE}>
        <div className='max-w-md w-full bg-white rounded-2xl border border-slate-100 p-8 md:p-10 shadow-xl shadow-slate-200/40 text-center flex flex-col items-center gap-3'>
          <CheckCircle2 size={40} strokeWidth={1.5} className='text-indigo-600' />
          <p className='text-[#1D1D1F] font-semibold'>Rahmat! Arizangiz qabul qilindi.</p>
          <p className='text-slate-400 text-xs'>Tez orada siz bilan bog'lanamiz.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={PAGE}>
      <form onSubmit={submit} className='max-w-md w-full bg-white rounded-2xl border border-slate-100 p-8 md:p-10 shadow-xl shadow-slate-200/40 flex flex-col gap-6'>
        <div className='text-center mb-2 flex flex-col items-center gap-3'>
          <Logo size={44} withWordmark={false} />
          <div>
            <h3 className='text-lg font-semibold text-slate-700'>{form.name || "Kursga ro'yxatdan o'tish"}</h3>
            <p className='text-xs text-slate-400 mt-1'>Ma'lumotlaringizni qoldiring, biz siz bilan tez orada bog'lanamiz</p>
          </div>
        </div>

        <div className='flex flex-col gap-4'>
          {form.fields.map(field => (
            <div key={field.key}>
              <label className={LABEL}>{field.label}{field.required && ' *'}</label>
              {field.type === 'textarea' ? (
                <textarea value={values[field.key] || ''} onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                  required={field.required} rows={3} className={FIELD} />
              ) : field.type === 'select' ? (
                <Select value={values[field.key] || ''} onChange={(v) => setValues({ ...values, [field.key]: v })} placeholder='—'
                  options={field.options.map(o => ({ value: o, label: o }))} />
              ) : (
                <input type={field.type === 'phone' ? 'tel' : 'text'} value={values[field.key] || ''} onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                  placeholder={field.type === 'phone' ? '+998 (__) ___-__-__' : undefined}
                  required={field.required} className={FIELD} />
              )}
            </div>
          ))}
        </div>

        {error && <p className='text-rose-500 text-sm'>{error}</p>}

        <button type='submit' disabled={submitting}
          className='w-full bg-accent active:scale-[0.99] text-white font-medium text-sm py-3.5 rounded-xl transition-all mt-2 cursor-pointer text-center disabled:opacity-50 flex items-center justify-center gap-2'>
          {submitting && <Spinner size={14} />} {submitting ? 'Yuborilmoqda…' : 'Yuborish'}
        </button>
      </form>
    </div>
  )
}

export default PublicLeadForm
