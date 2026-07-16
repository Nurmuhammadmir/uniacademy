import React, { useContext } from 'react'
import { StudentContext } from '../context/StudentContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'
import FontSizeControl from '../components/FontSizeControl.jsx'
import InstallAppCard from '../components/InstallAppCard.jsx'

const CourseCard = ({ course, t }) => {
  const remaining = course.price ? Math.max(0, course.price - course.balance) : null
  return (
    <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-3'>
      <div className='flex justify-between items-start mb-2'>
        <p className='text-ink font-medium'>{course.languageId?.name} · {course.levelId?.name}</p>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${course.isActive ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>
          {course.isActive ? t('active') : t('unpaid')}
        </span>
      </div>
      <div className='grid grid-cols-2 gap-2 text-sm'>
        <div><p className='text-muted text-xs'>{t('monthlyPrice')}</p><p className='font-mono text-ink'>{course.price !== null ? formatMoney(course.price) : '—'}</p></div>
        <div><p className='text-muted text-xs'>{t('totalPaid')}</p><p className='font-mono text-ink'>{formatMoney(course.totalPaid)}</p></div>
        <div><p className='text-muted text-xs'>{t('balance')}</p><p className='font-mono text-ink'>{formatMoney(course.balance)}</p></div>
        <div><p className='text-muted text-xs'>{t('nextDue')}</p><p className='font-mono text-ink'>{course.subscriptionExpiresAt ? new Date(course.subscriptionExpiresAt).toLocaleDateString() : '—'}</p></div>
      </div>
      {!course.isActive && remaining !== null && remaining > 0 && (
        <p className='text-xs text-accent mt-2'>{t('moreNeeded', { amount: formatMoney(remaining) })}</p>
      )}
    </div>
  )
}

const Profile = () => {
  const { me, logout } = useContext(StudentContext)
  const { t, lang, setLang, availableLanguages } = useLanguage()
  if (!me) return <div className='px-6 pt-16 text-muted'>{t('loading')}</div>

  const { student, courses } = me

  return (
    <div className='px-5 pt-10'>
      <p className='font-display text-2xl text-ink mb-6'>{t('profile')}</p>

      <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-4'>
        <div className='w-14 h-14 rounded-full bg-accent-soft text-accent flex items-center justify-center font-display text-xl mb-4'>
          {student.name?.[0]?.toUpperCase()}
        </div>
        <p className='text-ink font-medium text-lg mb-1'>{student.name}</p>
        <p className='text-muted text-sm font-mono mb-1'>{student.phone}</p>
        <p className='text-muted text-sm'>{student.branchId?.name}</p>
      </div>

      <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-4'>
        <p className='text-muted text-xs mb-2'>{t('language')}</p>
        <div className='flex flex-wrap gap-2'>
          {availableLanguages.map(l => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${lang === l.code ? 'bg-accent text-white' : 'bg-bg border border-hairline text-ink'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-4'>
        <FontSizeControl label={t('textSize')} />
      </div>

      <InstallAppCard t={t} />

      <p className='text-ink font-medium mb-2'>{t('myCourses')}</p>
      {courses.map(c => <CourseCard key={c._id} course={c} t={t} />)}
      {courses.length === 0 && <p className='text-muted text-sm mb-4'>{t('noCourseYet')}</p>}

      <button onClick={logout} className='w-full py-4 rounded-2xl border border-hairline text-muted font-medium mt-3'>
        {t('signOut')}
      </button>
    </div>
  )
}

export default Profile
