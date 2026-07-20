import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

// fully public, unauthenticated page - anyone with the link lands here with no admin session at
// all, so this talks to the backend directly rather than through AdminContext (which assumes a
// logged-in admin and would redirect to Login on any 401)
const backendUrl = import.meta.env.VITE_BACKEND_URL

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
      setError(err.response?.data?.error === 'missing_required_field' ? 'Please fill in all required fields.' : 'Something went wrong - please try again.')
    }
    setSubmitting(false)
  }

  if (notFound) return <div className='min-h-screen flex items-center justify-center bg-bg px-6'><p className='text-muted'>This form isn't available.</p></div>
  if (!form) return <div className='min-h-screen flex items-center justify-center bg-bg px-6'><p className='text-muted'>Loading…</p></div>

  if (submitted) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-bg px-6'>
        <div className='bg-bg-elevated border border-hairline rounded-2xl p-8 max-w-sm w-full text-center'>
          <p className='text-3xl mb-3'>✓</p>
          <p className='text-ink font-medium'>Thank you! We received your submission.</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-bg px-6 py-10'>
      <form onSubmit={submit} className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-md w-full flex flex-col gap-3'>
        {form.name && <p className='font-display text-xl text-ink mb-1'>{form.name}</p>}
        {form.fields.map(field => (
          <div key={field.key}>
            <p className='text-xs text-muted mb-1'>{field.label}{field.required && ' *'}</p>
            {field.type === 'textarea' ? (
              <textarea value={values[field.key] || ''} onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                required={field.required} rows={3} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
            ) : field.type === 'select' ? (
              <select value={values[field.key] || ''} onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                required={field.required} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
                <option value=''>—</option>
                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={field.type === 'phone' ? 'tel' : 'text'} value={values[field.key] || ''} onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                required={field.required} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
            )}
          </div>
        ))}
        {error && <p className='text-red-500 text-sm'>{error}</p>}
        <button type='submit' disabled={submitting} className='py-2.5 rounded-lg bg-accent text-white font-medium disabled:opacity-50'>
          {submitting ? '…' : 'Submit'}
        </button>
      </form>
    </div>
  )
}

export default PublicLeadForm
