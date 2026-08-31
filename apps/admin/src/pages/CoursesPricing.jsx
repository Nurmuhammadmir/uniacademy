import React, { useContext, useMemo, useState } from 'react'
import { BookOpen, Globe, GraduationCap, Atom, Sparkles, Compass, Search } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'
import Select from '../components/Select.jsx'

// a course has no icon/color of its own, so each card is assigned one from this small fixed
// palette by position - purely decorative variety (Mac-widget look: a soft system-color disc
// behind a glyph), not a meaningful category encoding
const ICON_PALETTE = [
  { icon: BookOpen, bg: 'bg-[#EFF6FF] dark:bg-[#1E3A5F]/40', text: 'text-[#007AFF] dark:text-[#60A5FA]' },
  { icon: Globe, bg: 'bg-[#ECFDF5] dark:bg-[#064E3B]/40', text: 'text-[#059669] dark:text-[#34D399]' },
  { icon: GraduationCap, bg: 'bg-[#F5F3FF] dark:bg-[#4C1D95]/30', text: 'text-[#7C3AED] dark:text-[#A78BFA]' },
  { icon: Atom, bg: 'bg-[#FFF7ED] dark:bg-[#7C2D12]/30', text: 'text-[#EA580C] dark:text-[#FB923C]' },
  { icon: Sparkles, bg: 'bg-[#FDF2F8] dark:bg-[#831843]/30', text: 'text-[#DB2777] dark:text-[#F472B6]' },
  { icon: Compass, bg: 'bg-[#F0FDFA] dark:bg-[#134E4A]/40', text: 'text-[#0D9488] dark:text-[#2DD4BF]' },
]

// read-only - prices are set by the director (Pricing.jsx there, or right on the course itself in
// Courses.jsx); this just gives admin visibility into what's configured. One card per COURSE
// (language) - price isn't set per-level, see server/models/Pricing.js.
const CoursesPricing = () => {
  const { pricingList } = useContext(AdminContext)
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  const tagOptions = Object.values(
    pricingList.reduce((acc, p) => {
      for (const c of (p.languageId?.categoryIds || [])) acc[c._id] = c
      return acc
    }, {})
  ).sort((a, b) => a.name.localeCompare(b.name))

  const visiblePricing = useMemo(() => {
    const q = search.trim().toLowerCase()
    return pricingList
      .filter(p => {
        if (q && !p.languageId?.name?.toLowerCase().includes(q)) return false
        if (tagFilter && !(p.languageId?.categoryIds || []).some(c => c._id === tagFilter)) return false
        return true
      })
      .sort((a, b) => (a.languageId?.name || '').localeCompare(b.languageId?.name || ''))
  }, [pricingList, search, tagFilter])

  return (
    <div>
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5'>
        <div>
          <p className='font-display text-2xl text-ink'>{t('coursesPricingTitle')}</p>
          <p className='text-muted text-sm mt-0.5'>{t('coursesPricingHint')}</p>
        </div>

        {pricingList.length > 0 && (
          <div className='flex flex-wrap gap-2'>
            <div className='relative flex-1 min-w-[9rem] max-w-[14rem]'>
              <Search size={13} strokeWidth={2} className='absolute left-3 top-1/2 -translate-y-1/2 text-muted' />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchCoursesPlaceholder')}
                className='w-full pl-8 pr-3 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-xs' />
            </div>
            {tagOptions.length > 0 && (
              <Select className='w-40 [&_button]:!h-8 [&_button]:!py-1.5 [&_button]:!text-xs' value={tagFilter} onChange={setTagFilter} placeholder={t('allCategoriesOption')}
                options={[{ value: '', label: t('allCategoriesOption') }, ...tagOptions.map(c => ({ value: c._id, label: c.name }))]} />
            )}
            {(search || tagFilter) && (
              <button onClick={() => { setSearch(''); setTagFilter('') }} className='text-muted text-xs px-1'>{t('clearFilters')}</button>
            )}
          </div>
        )}
      </div>

      {pricingList.length === 0 ? (
        <div className='bg-bg-elevated border border-hairline rounded-2xl p-8 flex flex-col items-center text-center text-muted text-sm gap-2'>
          <BookOpen size={28} strokeWidth={1.5} className='text-slate-300 dark:text-slate-700' />
          {t('noPricingSetError')}
        </div>
      ) : visiblePricing.length === 0 ? (
        <div className='bg-bg-elevated border border-hairline rounded-2xl p-8 flex flex-col items-center text-center text-muted text-sm gap-2'>
          <Search size={24} strokeWidth={1.5} className='text-slate-300 dark:text-slate-700' />
          {t('noCoursesMatchFilters')}
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
          {visiblePricing.map((p, i) => {
            const { icon: Icon, bg, text } = ICON_PALETTE[i % ICON_PALETTE.length]
            const categories = p.languageId?.categoryIds || []
            return (
              <div key={p._id}
                className='bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out'>
                <div className='flex items-center gap-2.5 mb-3 min-w-0'>
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <Icon size={17} strokeWidth={2} className={text} />
                  </span>
                  <p className='font-semibold text-sm text-ink truncate' title={p.languageId?.name}>{p.languageId?.name || '—'}</p>
                </div>
                <div className='flex items-center justify-between gap-2'>
                  {categories.length > 0 ? (
                    <span className='text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 truncate'>{categories[0].name}</span>
                  ) : <span />}
                  <span className='font-mono font-bold text-sm text-ink flex-shrink-0'>{formatMoney(p.monthlyPrice)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CoursesPricing
