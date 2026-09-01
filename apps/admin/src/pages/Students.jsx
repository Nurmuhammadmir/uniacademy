import React, { lazy, Suspense, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Menu } from '@headlessui/react'
import { MoreHorizontal, Edit2, CreditCard, Archive, RotateCcw, Trash2, Plus, Download, Tag, Search, Users, Phone, AlertCircle } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import Select from '../components/Select.jsx'
import Spinner from '../components/Spinner.jsx'
import DatePicker from '../components/DatePicker.jsx'
import ReceiptModal from '../components/ReceiptModal.jsx'
import { formatMoney, groupLabel } from '../lib/format.js'
import { todayISO } from '../lib/date.js'

// mapbox-gl alone is well over a megabyte - pulling it in as a normal top-level import would bloat
// THIS page's chunk even though the map only ever renders inside the add/edit-student modals. Lazy
// so it's fetched only once someone actually opens one of those modals, not on every visit to the
// students list (this app's default landing route).
const MapPicker = lazy(() => import('../components/MapPicker.jsx'))
const MapFallback = () => (
  <div className='h-56 rounded-xl bg-bg border border-hairline flex items-center justify-center'>
    <Spinner size={20} className='text-accent dark:text-[#818CF8]' />
  </div>
)

// one "..." menu per row replaces the 4 always-visible text links the table used to show - keeps
// the row scannable and puts every action (edit/pay/archive/delete) behind a single, familiar
// affordance instead of four competing labels fighting for space on every single row.
// `anchor` (Headless UI v2's Floating-UI-backed positioning) is load-bearing here, not cosmetic -
// without it Menu.Items is a plain `position: absolute` box, which the table wrapper's own
// `overflow-hidden` (needed for its rounded corners) clips/misplaces for any row near the bottom of
// the table. Anchored positioning escapes that clipping instead of fighting it.
const MENU_ITEM = 'plain w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors'
const RowActionsMenu = ({ student, statusTab, onEdit, onPay, onArchive, onUnarchive, onDeletePermanently, t }) => (
  <Menu as='div' className='relative inline-block text-left' onClick={e => e.stopPropagation()}>
    <Menu.Button className='plain p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-600 dark:hover:text-slate-300 dark:hover:bg-slate-800/40'>
      <MoreHorizontal size={18} strokeWidth={1.5} />
    </Menu.Button>
    <Menu.Items anchor='bottom end' transition
      className='w-48 rounded-xl bg-white border border-slate-100 shadow-xl p-1.5 focus:outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:6px] dark:bg-[#161F30] dark:border-slate-800/80 dark:shadow-black/40'>
      {statusTab === 'active' ? (
        <>
          <Menu.Item>
            {({ active }) => <button onClick={() => onEdit(student)} className={`${MENU_ITEM} text-slate-700 dark:text-slate-300 ${active ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}><Edit2 size={14} strokeWidth={1.5} /> {t('edit')}</button>}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => <button onClick={() => onPay(student)} className={`${MENU_ITEM} text-slate-700 dark:text-slate-300 ${active ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}><CreditCard size={14} strokeWidth={1.5} /> {t('recordPayment')}</button>}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => <button onClick={() => onArchive(student._id)} className={`${MENU_ITEM} text-slate-700 dark:text-slate-300 ${active ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}><Archive size={14} strokeWidth={1.5} /> {t('archiveBtn')}</button>}
          </Menu.Item>
        </>
      ) : (
        <Menu.Item>
          {({ active }) => <button onClick={() => onUnarchive(student._id)} className={`${MENU_ITEM} text-slate-700 dark:text-slate-300 ${active ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}><RotateCcw size={14} strokeWidth={1.5} /> {t('reactivateBtn')}</button>}
        </Menu.Item>
      )}
      <Menu.Item>
        {({ active }) => <button onClick={() => onDeletePermanently(student._id)} className={`${MENU_ITEM} text-rose-600 dark:text-rose-400 ${active ? 'bg-rose-50 dark:bg-rose-500/10' : ''}`}><Trash2 size={14} strokeWidth={1.5} /> {t('deletePermanentlyBtn')}</button>}
      </Menu.Item>
    </Menu.Items>
  </Menu>
)

// no photo field exists on a student (User.js has none) - every avatar is initials on a gradient,
// the gradient itself picked deterministically from the name so the same student always lands on
// the same color instead of it reshuffling on every render
const AVATAR_GRADIENTS = [
  'from-[#FF6B6B] to-[#FF3B30]', 'from-[#FF9F43] to-[#FF9500]', 'from-[#34C759] to-[#30B94D]',
  'from-[#5AC8FA] to-[#007AFF]', 'from-[#5E5CE6] to-[#5856D6]', 'from-[#BF5AF2] to-[#AF52DE]',
  'from-[#FF7EB9] to-[#FF2D55]', 'from-[#64D2FF] to-[#32ADE6]',
]
const avatarGradient = (name) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')

// how far (px) one swipe-revealed action button is - two actions (call+archive) on the active tab,
// just one (reactivate) on the archived tab, so the reveal width itself differs per tab
const SWIPE_ACTION_WIDTH = 72

// a real, working swipe-to-reveal (not just a static mock) - touch-tracked horizontal drag on the
// card's own content layer, sliding it left to expose action buttons pinned underneath, same feel
// as Mail/Messages on iOS. Transition is suppressed WHILE actively dragging (so the card tracks the
// finger 1:1 with no lag) and re-enabled only for the snap-open/snap-closed settle after release.
const SwipeableStudentCard = ({ student, statusTab, owed, courseTags, selecting, selected, onOpen, onToggleSelect, onArchive, onUnarchive, t }) => {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const openRef = useRef(false)
  const dragState = useRef({ startX: 0, tracking: false, moved: false })
  const actionsWidth = statusTab === 'active' ? SWIPE_ACTION_WIDTH * 2 : SWIPE_ACTION_WIDTH

  const onTouchStart = (e) => {
    if (selecting) return
    dragState.current = { startX: e.touches[0].clientX, tracking: true, moved: false }
    setDragging(true)
  }
  const onTouchMove = (e) => {
    if (!dragState.current.tracking) return
    const delta = e.touches[0].clientX - dragState.current.startX
    if (Math.abs(delta) > 5) dragState.current.moved = true
    const base = openRef.current ? -actionsWidth : 0
    setDragX(Math.min(0, Math.max(-actionsWidth, base + delta)))
  }
  const onTouchEnd = () => {
    dragState.current.tracking = false
    setDragging(false)
    const shouldOpen = dragX < -actionsWidth / 2
    openRef.current = shouldOpen
    setDragX(shouldOpen ? -actionsWidth : 0)
  }
  const close = () => { openRef.current = false; setDragX(0) }

  const onCardClick = () => {
    if (dragState.current.moved) return
    if (openRef.current) { close(); return }
    selecting ? onToggleSelect(student._id) : onOpen(student._id)
  }

  return (
    <div className='relative overflow-hidden rounded-xl'>
      {!selecting && (
        <div className='absolute inset-y-0 right-0 flex'>
          {statusTab === 'active' && (
            <a href={`tel:${student.phone}`} onClick={e => e.stopPropagation()} style={{ width: SWIPE_ACTION_WIDTH }}
              className='flex flex-col items-center justify-center gap-1 bg-emerald-500 text-white text-[11px] font-medium'>
              <Phone size={16} strokeWidth={2} /> {t('callBtn')}
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); close(); statusTab === 'active' ? onArchive(student._id) : onUnarchive(student._id) }}
            style={{ width: SWIPE_ACTION_WIDTH }}
            className={`flex flex-col items-center justify-center gap-1 text-white text-[11px] font-medium ${statusTab === 'active' ? 'bg-rose-500' : 'bg-accent'}`}>
            {statusTab === 'active' ? <Archive size={16} strokeWidth={2} /> : <RotateCcw size={16} strokeWidth={2} />}
            {statusTab === 'active' ? t('archiveBtn') : t('reactivateBtn')}
          </button>
        </div>
      )}

      <button
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onClick={onCardClick}
        style={{ transform: `translateX(${dragX}px)` }}
        className={`plain relative z-10 bg-white dark:bg-[#161F30] rounded-xl border border-slate-100 dark:border-slate-800/80 p-3.5 shadow-sm dark:shadow-black/40 text-left w-full flex items-center gap-3 ${dragging ? '' : 'transition-transform duration-200 ease-out'}`}>
        {selecting ? (
          <input type='checkbox' checked={selected} readOnly className='w-5 h-5 flex-shrink-0 pointer-events-none' />
        ) : (
          <span className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGradient(student.name)} flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm shadow-sm`}>
            {initials(student.name)}
          </span>
        )}
        <div className='min-w-0 flex-1'>
          <p className='font-semibold text-base text-[#1D1D1F] dark:text-[#F8FAFC] truncate'>{student.name}</p>
          <div className='flex flex-wrap gap-1 mt-1'>
            {courseTags.length > 0 ? courseTags.map((name, i) => (
              <span key={i} className='text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100/80 text-slate-600 dark:bg-white/10 dark:text-slate-300'>{name}</span>
            )) : <span className='text-[11px] text-muted'>—</span>}
          </div>
        </div>
        <span className={`flex-shrink-0 font-mono text-sm font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${owed > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {owed > 0 ? `-${formatMoney(owed)}` : owed < 0 ? `+${formatMoney(-owed)}` : formatMoney(0)}
        </span>
      </button>
    </div>
  )
}

const Students = () => {
  const { students, createStudent, updateStudent, deleteStudent, permanentlyDeleteStudent, unarchiveStudent, createPayment, applyDiscount, languages, settings, groups } = useContext(AdminContext)
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('active')
  // linked from the Finance page's "Debtors" summary card (/?debtors=1) - reads once on landing so
  // that link actually pre-filters instead of just navigating to a plain, unfiltered list
  const [debtorsOnly, setDebtorsOnly] = useState(() => searchParams.get('debtors') === '1')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [payingStudent, setPayingStudent] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', password: '', address: '', dateOfBirth: '', geo: { lat: null, lng: null }, groupId: '', passportInfo: '', parentPhone: '', parentPassword: '', registeredAt: todayISO(), enrolledAt: todayISO() })
  const [editForm, setEditForm] = useState({ name: '', phone: '', password: '', address: '', dateOfBirth: '', geo: { lat: null, lng: null }, passportInfo: '' })
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: '' })
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [printingPaymentId, setPrintingPaymentId] = useState(null)
  const [discountMode, setDiscountMode] = useState(false)
  const [discountScope, setDiscountScope] = useState('students') // 'students' | 'groups' | 'course'
  const [selectedForDiscount, setSelectedForDiscount] = useState([])
  const [selectedGroupsForDiscount, setSelectedGroupsForDiscount] = useState([])
  const [discountForm, setDiscountForm] = useState({ languageId: '', type: 'percent', value: '' })
  const [applyingDiscount, setApplyingDiscount] = useState(false)

  const submitCreate = async (e) => {
    e.preventDefault()
    if (form.geo.lat == null || form.geo.lng == null) { toast.error(t('locationRequiredWarning')); return }
    const ok = await createStudent({ ...form, groupId: form.groupId || undefined })
    if (ok) { setShowCreate(false); setForm({ name: '', phone: '', password: '', address: '', dateOfBirth: '', geo: { lat: null, lng: null }, groupId: '', passportInfo: '', parentPhone: '', parentPassword: '', registeredAt: todayISO(), enrolledAt: todayISO() }) }
  }

  const openEdit = (student) => {
    setEditing(student)
    setEditForm({ name: student.name, phone: student.phone, password: '', address: student.address || '', dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '', geo: student.geo || { lat: null, lng: null }, passportInfo: student.passportInfo || '' })
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const ok = await updateStudent(editing._id, editForm)
    if (ok) setEditing(null)
  }

  // a course entry the student has since left keeps existing (groupId cleared) purely so admin
  // balance history can still trace what was ever billed for it - it's not something payable/
  // "currently taking" any more, so every course picker/summary/tag in this list works off this
  // filtered view instead of the raw student.courses array
  const currentCourses = (student) => student.courses.filter(c => c.groupId)

  // confirmed spec: a payment is never for one particular course - it's a deposit into the
  // student's one shared wallet. Defaults the amount to whatever the account currently owes
  // overall (student.owed, the real stored Account.balance - see adminController.listStudents).
  const openPay = (student) => {
    setPayingStudent(student)
    setPaymentForm({ amount: student.owed > 0 ? String(student.owed) : '', method: '' })
  }

  const submitPayment = async (e) => {
    e.preventDefault()
    // guards against a double payment being recorded from a double-click/double-tap on "Confirm
    // payment" - without this, each extra click created a second real Payment document, silently
    // inflating that student's balance and the branch's revenue totals by the duplicated amount.
    if (submittingPayment) return
    if (!paymentForm.method) { toast.error(t('selectPaymentMethodWarning')); return }
    setSubmittingPayment(true)
    const paymentId = await createPayment(payingStudent._id, Number(paymentForm.amount), paymentForm.method)
    setSubmittingPayment(false)
    if (paymentId) {
      setPayingStudent(null); setPaymentForm({ amount: '', method: '' })
      setPrintingPaymentId(paymentId)
    }
  }

  const courseSummary = (student) => currentCourses(student).length === 0 ? '—' : currentCourses(student).map(c => c.levelId?.name ? `${c.languageId?.name} · ${c.levelId.name}` : c.languageId?.name).join(', ')
  const courseTags = (student) => currentCourses(student).map(c => c.languageId?.name).filter(Boolean)
  const anyActive = (student) => currentCourses(student).some(c => c.enrollmentStatus === 'active')

  // one row per student, every detail in its own column - reuses the same CSV-building pattern
  // already used for a group's roster export (GroupDetails.jsx), just with more columns. Exports
  // exactly whatever's currently visible (respects the active/archived tab + search filter).
  const exportStudentsCSV = () => {
    const header = ['#', 'Name', 'Phone', 'Status', 'Courses', 'Total balance', 'Passport info', 'Registered on']
    const rows = filteredStudents.map((s, i) => [
      i + 1, s.name, s.phone, anyActive(s) ? t('active') : t('unpaid'),
      courseSummary(s), -(s.owed || 0), s.passportInfo || '', new Date(s.createdAt).toLocaleDateString(),
    ])
    // the leading "sep=," line is an Excel-only directive that forces it to use comma as the column
    // separator regardless of the machine's regional settings - without it, a Windows install whose
    // locale uses comma as the decimal separator (Uzbek/Russian, among many others) defaults to
    // semicolon-delimited CSV on import, so a plain comma-joined file opens as a single column.
    const csv = 'sep=,\n' + [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `students-${statusTab}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleDiscountMode = () => {
    setDiscountMode(m => !m)
    setDiscountScope('students')
    setSelectedForDiscount([])
    setSelectedGroupsForDiscount([])
  }

  const toggleStudentForDiscount = (studentId) => {
    setSelectedForDiscount(ids => ids.includes(studentId) ? ids.filter(id => id !== studentId) : [...ids, studentId])
  }

  const toggleGroupForDiscount = (groupId) => {
    setSelectedGroupsForDiscount(ids => ids.includes(groupId) ? ids.filter(id => id !== groupId) : [...ids, groupId])
  }

  const changeDiscountScope = (scope) => {
    setDiscountScope(scope)
    setSelectedForDiscount([])
    setSelectedGroupsForDiscount([])
  }

  const submitDiscount = async (e) => {
    e.preventDefault()
    if (!discountForm.value) return
    if (discountScope === 'students' && (selectedForDiscount.length === 0 || !discountForm.languageId)) return
    if (discountScope === 'groups' && selectedGroupsForDiscount.length === 0) return
    if (discountScope === 'course' && !discountForm.languageId) return
    setApplyingDiscount(true)
    const payload = discountScope === 'students'
      ? { scope: 'students', studentIds: selectedForDiscount, languageId: discountForm.languageId, type: discountForm.type, value: Number(discountForm.value) }
      : discountScope === 'groups'
      ? { scope: 'group', groupIds: selectedGroupsForDiscount, type: discountForm.type, value: Number(discountForm.value) }
      : { scope: 'course', languageId: discountForm.languageId, type: discountForm.type, value: Number(discountForm.value) }
    await applyDiscount(payload)
    setApplyingDiscount(false)
    setDiscountMode(false)
    setSelectedForDiscount([])
    setSelectedGroupsForDiscount([])
    setDiscountForm({ languageId: '', type: 'percent', value: '' })
  }

  const filteredStudents = students.filter(s => {
    if ((s.status || 'active') !== statusTab) return false
    if (debtorsOnly && !((s.owed || 0) > 0)) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return s.name.toLowerCase().includes(q) || s.phone.toLowerCase().includes(q)
  })
  const debtorsCount = students.filter(s => (s.status || 'active') === statusTab && (s.owed || 0) > 0).length
  // checkboxes/row-select only make sense when targeting specific students - a 'course'-scoped
  // discount applies to everyone enrolled automatically, nothing to hand-pick from the list
  const selectingStudents = discountMode && discountScope === 'students'

  return (
    <div>
      <div className='sticky top-0 z-20 bg-bg pb-4 mb-2 border-b border-hairline'>
        {/* ---------- desktop (unchanged) ---------- */}
        <div className='hidden md:block'>
          <div className='flex justify-between items-center mb-6'>
            <div className='flex items-baseline gap-3'>
              <p className='font-display text-2xl text-ink'>{t('studentsTitle')}</p>
              <span className='text-sm font-medium text-muted'>{t('studentsCountLabel', { count: filteredStudents.length })}</span>
            </div>
            <div className='flex gap-2'>
              <button onClick={toggleDiscountMode} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 ${discountMode ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg-elevated border border-hairline text-muted hover:bg-bg'}`}><Tag size={14} /> {t('discountBtn')}</button>
              <button onClick={exportStudentsCSV} className='px-4 py-2 rounded-xl bg-bg-elevated border border-hairline text-muted hover:bg-bg text-sm font-medium flex items-center gap-1.5'><Download size={14} /> {t('exportBtn')}</button>
              <button onClick={() => setShowCreate(true)} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium flex items-center gap-1.5 dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'><Plus size={14} /> {t('addStudent')}</button>
            </div>
          </div>

          <div className='flex gap-2 mb-3'>
            <button onClick={() => setStatusTab('active')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusTab === 'active' ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg-elevated border border-hairline text-muted'}`}>{t('activeStatusTab')}</button>
            <button onClick={() => setStatusTab('archived')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusTab === 'archived' ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg-elevated border border-hairline text-muted'}`}>{t('archivedStatusTab')}</button>
          </div>

          <div className='flex gap-2 items-center flex-wrap'>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchByNameOrPhone')}
              className='w-full max-w-sm px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm'
            />
            <button onClick={() => setDebtorsOnly(v => !v)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-colors ${debtorsOnly ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : 'bg-bg-elevated border border-hairline text-muted'}`}>
              {t('debtorsFilterBtn')} {debtorsCount > 0 && <span className='text-xs opacity-70'>({debtorsCount})</span>}
            </button>
          </div>
          {debtorsOnly && <p className='text-xs text-muted mt-2'>{t('debtorsOnlyHint')}</p>}
        </div>

        {/* ---------- mobile ---------- */}
        <div className='md:hidden'>
          <div className='flex justify-between items-center mb-3'>
            <p className='font-display text-2xl text-ink'>{t('studentsTitle')}</p>
            <button onClick={() => setShowCreate(true)} aria-label={t('addStudent')}
              className='w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0 shadow-sm dark:bg-[#4F46E5]'>
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Apple-widget style horizontal scroll-snap metric strip - replaces the row of buttons
              that used to wrap onto multiple ugly lines on a narrow screen */}
          <div className='flex gap-2.5 overflow-x-auto no-scrollbar snap-x pb-1 -mx-4 px-4 mb-3'>
            <div className='snap-start flex-shrink-0 w-[92px] rounded-xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.06] border border-white/60 dark:border-white/10 shadow-sm px-3 py-2.5 flex flex-col gap-1'>
              <Users size={15} strokeWidth={2} className='text-accent dark:text-[#818CF8]' />
              <p className='font-mono text-lg font-semibold text-ink leading-none'>{filteredStudents.length}</p>
              <p className='text-[10px] text-muted leading-none truncate'>{t('studentsTitle')}</p>
            </div>
            <button onClick={() => setDebtorsOnly(v => !v)}
              className={`snap-start flex-shrink-0 w-[92px] rounded-xl backdrop-blur-xl border shadow-sm px-3 py-2.5 flex flex-col gap-1 text-left transition-colors ${debtorsOnly ? 'bg-rose-500 border-rose-500' : 'bg-white/70 dark:bg-white/[0.06] border-white/60 dark:border-white/10'}`}>
              <AlertCircle size={15} strokeWidth={2} className={debtorsOnly ? 'text-white' : 'text-rose-500'} />
              <p className={`font-mono text-lg font-semibold leading-none ${debtorsOnly ? 'text-white' : 'text-ink'}`}>{debtorsCount}</p>
              <p className={`text-[10px] leading-none truncate ${debtorsOnly ? 'text-white/80' : 'text-muted'}`}>{t('debtorsFilterBtn')}</p>
            </button>
            <button onClick={toggleDiscountMode}
              className={`snap-start flex-shrink-0 w-[92px] rounded-xl backdrop-blur-xl border shadow-sm px-3 py-2.5 flex flex-col gap-1 text-left transition-colors ${discountMode ? 'bg-accent border-accent dark:bg-[#4F46E5] dark:border-[#4F46E5]' : 'bg-white/70 dark:bg-white/[0.06] border-white/60 dark:border-white/10'}`}>
              <Tag size={15} strokeWidth={2} className={discountMode ? 'text-white' : 'text-accent dark:text-[#818CF8]'} />
              <p className={`text-sm font-semibold leading-tight mt-1 ${discountMode ? 'text-white' : 'text-ink'}`}>{t('discountBtn')}</p>
            </button>
            <button onClick={exportStudentsCSV}
              className='snap-start flex-shrink-0 w-[92px] rounded-xl backdrop-blur-xl bg-white/70 dark:bg-white/[0.06] border border-white/60 dark:border-white/10 shadow-sm px-3 py-2.5 flex flex-col gap-1 text-left'>
              <Download size={15} strokeWidth={2} className='text-accent dark:text-[#818CF8]' />
              <p className='text-sm font-semibold leading-tight mt-1 text-ink'>{t('exportBtn')}</p>
            </button>
          </div>
          {debtorsOnly && <p className='text-xs text-muted mb-3'>{t('debtorsOnlyHint')}</p>}

          {/* iOS-style segmented control */}
          <div className='relative flex bg-slate-100 dark:bg-white/[0.06] rounded-xl p-1 mb-3'>
            <div className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white dark:bg-white/15 shadow-sm transition-transform duration-200 ease-out ${statusTab === 'archived' ? 'translate-x-full' : 'translate-x-0'}`} />
            <button onClick={() => setStatusTab('active')} className={`plain relative z-10 flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${statusTab === 'active' ? 'text-ink' : 'text-muted'}`}>{t('activeStatusTab')}</button>
            <button onClick={() => setStatusTab('archived')} className={`plain relative z-10 flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${statusTab === 'archived' ? 'text-ink' : 'text-muted'}`}>{t('archivedStatusTab')}</button>
          </div>

          {/* iOS-style search field */}
          <div className='relative'>
            <Search size={16} strokeWidth={2} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none' />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchByNameOrPhone')}
              className='w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-100 dark:bg-zinc-800 border-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/40'
            />
          </div>
        </div>

        {discountMode && (
          <form onSubmit={submitDiscount} className='flex flex-wrap gap-3 items-end mt-4 bg-bg-elevated border border-hairline rounded-xl p-4'>
            <div className='flex gap-1 w-full'>
              <button type='button' onClick={() => changeDiscountScope('students')} className={`px-3 py-2 rounded-lg text-sm font-medium ${discountScope === 'students' ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg border border-hairline text-muted'}`}>{t('discountScopeStudents')}</button>
              <button type='button' onClick={() => changeDiscountScope('groups')} className={`px-3 py-2 rounded-lg text-sm font-medium ${discountScope === 'groups' ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg border border-hairline text-muted'}`}>{t('discountScopeGroups')}</button>
              <button type='button' onClick={() => changeDiscountScope('course')} className={`px-3 py-2 rounded-lg text-sm font-medium ${discountScope === 'course' ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg border border-hairline text-muted'}`}>{t('discountScopeCourse')}</button>
            </div>

            {discountScope === 'students' && (
              <>
                <p className='text-sm text-ink font-medium w-full'>{t('discountSelectedCount', { count: selectedForDiscount.length })}</p>
                <Select className='w-40' value={discountForm.languageId} onChange={(v) => setDiscountForm({ ...discountForm, languageId: v })} placeholder={t('languageLabel')}
                  options={languages.map(l => ({ value: l._id, label: l.name }))} />
              </>
            )}

            {discountScope === 'groups' && (
              <div className='w-full'>
                <p className='text-sm text-ink font-medium mb-2'>{t('discountSelectedGroupsCount', { count: selectedGroupsForDiscount.length })}</p>
                <div className='max-h-48 overflow-y-auto flex flex-col gap-1.5 bg-bg rounded-lg p-2'>
                  {groups.filter(g => g.status === 'active').map(g => (
                    <label key={g._id} className='flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-elevated cursor-pointer text-sm'>
                      <input type='checkbox' checked={selectedGroupsForDiscount.includes(g._id)} onChange={() => toggleGroupForDiscount(g._id)} />
                      <span className='text-ink'>{groupLabel(g)}</span>
                      <span className='text-muted text-xs'>· {g.languageId?.name}{g.levelId?.name ? ` · ${g.levelId.name}` : ''} · {g.teacherId?.name}</span>
                    </label>
                  ))}
                  {groups.filter(g => g.status === 'active').length === 0 && <p className='text-muted text-sm px-2 py-1'>{t('noGroupsYetPlain')}</p>}
                </div>
              </div>
            )}

            {discountScope === 'course' && (
              <>
                <p className='text-sm text-ink font-medium w-full'>{t('discountScopeCourseHint')}</p>
                <Select className='w-40' value={discountForm.languageId} onChange={(v) => setDiscountForm({ ...discountForm, languageId: v })} placeholder={t('languageLabel')}
                  options={languages.map(l => ({ value: l._id, label: l.name }))} />
              </>
            )}

            <div className='flex gap-1'>
              <button type='button' onClick={() => setDiscountForm({ ...discountForm, type: 'percent' })} className={`px-3 py-2 rounded-lg text-sm font-medium ${discountForm.type === 'percent' ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg border border-hairline text-muted'}`}>%</button>
              <button type='button' onClick={() => setDiscountForm({ ...discountForm, type: 'amount' })} className={`px-3 py-2 rounded-lg text-sm font-medium ${discountForm.type === 'amount' ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg border border-hairline text-muted'}`}>{t('amountLabel')}</button>
            </div>
            <input type='number' value={discountForm.value} onChange={e => setDiscountForm({ ...discountForm, value: e.target.value })}
              placeholder={discountForm.type === 'percent' ? t('discountPercentPlaceholder') : t('discountAmountPlaceholder')}
              className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm w-32' required />
            <button type='submit'
              disabled={applyingDiscount || !discountForm.value
                || (discountScope === 'students' && (selectedForDiscount.length === 0 || !discountForm.languageId))
                || (discountScope === 'groups' && selectedGroupsForDiscount.length === 0)
                || (discountScope === 'course' && !discountForm.languageId)}
              className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50 dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>
              {applyingDiscount ? t('applyingDiscountBtn') : t('applyDiscountBtn')}
            </button>
            <p className='text-muted text-xs w-full'>{t('discountImmediateNote')}</p>
          </form>
        )}
      </div>

      <div className='hidden md:block bg-bg-elevated border border-hairline rounded-2xl overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left border-b border-hairline'>
              {selectingStudents && <th className='px-5 py-3'></th>}
              <th className='px-5 py-3 font-medium text-slate-400 text-xs tracking-wider uppercase dark:text-slate-600'>{t('nameCol')}</th>
              <th className='px-5 py-3 font-medium text-slate-400 text-xs tracking-wider uppercase dark:text-slate-600'>{t('phoneCol')}</th>
              <th className='px-5 py-3 font-medium text-slate-400 text-xs tracking-wider uppercase dark:text-slate-600'>{t('coursesCol')}</th>
              <th className='px-5 py-3 font-medium text-slate-400 text-xs tracking-wider uppercase dark:text-slate-600'>{t('balanceCol')}</th>
              <th className='px-5 py-3 font-medium text-slate-400 text-xs tracking-wider uppercase dark:text-slate-600'>{t('statusCol')}</th>
              <th className='px-5 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(s => (
              <tr key={s._id}
                onClick={() => selectingStudents ? toggleStudentForDiscount(s._id) : navigate('/students/' + s._id)}
                className='border-b border-hairline last:border-0 cursor-pointer hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40'>
                {selectingStudents && (
                  <td className='px-5 py-4 align-middle' onClick={e => e.stopPropagation()}>
                    <input type='checkbox' checked={selectedForDiscount.includes(s._id)} onChange={() => toggleStudentForDiscount(s._id)} />
                  </td>
                )}
                <td className='px-5 py-4 align-middle font-medium text-slate-900 dark:text-[#F8FAFC]'>{s.name}</td>
                <td className='px-5 py-4 align-middle text-muted font-mono'>{s.phone}</td>
                <td className='px-5 py-4 align-middle text-muted'>{courseSummary(s)}</td>
                <td className='px-5 py-4 align-middle font-mono font-medium whitespace-nowrap'>
                  {(s.owed || 0) > 0 ? (
                    <span className='text-rose-600 dark:text-rose-400'>-{formatMoney(s.owed)}</span>
                  ) : (s.owed || 0) < 0 ? (
                    <span className='text-green-600 dark:text-emerald-400'>+{formatMoney(-s.owed)}</span>
                  ) : (
                    <span className='text-muted'>{formatMoney(0)}</span>
                  )}
                </td>
                <td className='px-5 py-4 align-middle'>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${anyActive(s) ? 'bg-green-50 text-green-700 border-green-200/60 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' : 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                    {anyActive(s) ? t('active') : t('unpaid')}
                  </span>
                </td>
                <td className='w-12 pr-4 py-4 align-middle text-right whitespace-nowrap'>
                  <RowActionsMenu student={s} statusTab={statusTab} onEdit={openEdit} onPay={openPay}
                    onArchive={deleteStudent} onUnarchive={unarchiveStudent} onDeletePermanently={permanentlyDeleteStudent} t={t} />
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr><td colSpan={selectingStudents ? 7 : 6} className='px-5 py-8 text-center text-muted'>{students.length === 0 ? t('noStudentsYet') : t('noStudentsMatchSearch')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {filteredStudents.length === 0 && (
          <p className='text-muted text-sm text-center py-8'>{students.length === 0 ? t('noStudentsYet') : t('noStudentsMatchSearch')}</p>
        )}
        {filteredStudents.map(s => (
          <SwipeableStudentCard key={s._id} student={s} statusTab={statusTab} owed={s.owed || 0}
            courseTags={courseTags(s)} selecting={selectingStudents} selected={selectedForDiscount.includes(s._id)}
            onOpen={(id) => navigate('/students/' + id)} onToggleSelect={toggleStudentForDiscount}
            onArchive={deleteStudent} onUnarchive={unarchiveStudent} t={t} />
        ))}
      </div>

      {showCreate && (
        <Modal title={t('addStudentModalTitle')} onClose={() => setShowCreate(false)}>
          <form onSubmit={submitCreate} className='flex flex-col gap-3'>
            <input placeholder={t('fullName')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('phoneNumber')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <PasswordInput placeholder={t('password')} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <div>
              <label className='text-xs text-muted mb-1 block'>{t('dateOfBirthLabel')}</label>
              <DatePicker withYearSelect value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} />
            </div>
            <div>
              {/* confirmed spec: a student who actually joined earlier and is only now being
                  entered into the system needs their real registration date, not always "today" */}
              <label className='text-xs text-muted mb-1 block'>{t('registeredAtLabel')}</label>
              <DatePicker value={form.registeredAt} onChange={(v) => setForm({ ...form, registeredAt: v })} />
            </div>
            <input
              placeholder={settings?.passportRequired === false ? t('passportIdInfoOptional') : t('passportIdInfo')}
              value={form.passportInfo}
              onChange={e => setForm({ ...form, passportInfo: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline'
              required={settings?.passportRequired !== false}
            />
            <p className='text-xs text-muted -mb-1'>{t('selectGroupOptionalHint')}</p>
            <Select forceSearch value={form.groupId} onChange={(v) => setForm({ ...form, groupId: v })} placeholder={t('noGroupOption')}
              options={[{ value: '', label: t('noGroupOption') }, ...groups.filter(g => g.status === 'active').map(g => ({
                value: g._id, label: `${groupLabel(g)} · ${g.languageId?.name}${g.levelId?.name ? ' · ' + g.levelId.name : ''} · ${formatMoney(g.price)}`,
              }))]} />
            {form.groupId && (
              <div>
                {/* confirmed spec: billing starts from whichever date is actually chosen here, not
                    always today - the admin can backdate when the student really joined this group */}
                <label className='text-xs text-muted mb-1 block'>{t('enrolledAtLabel')}</label>
                <DatePicker value={form.enrolledAt} onChange={(v) => setForm({ ...form, enrolledAt: v })} />
              </div>
            )}
            <p className='text-xs text-muted -mb-1'>{t('locationRequiredHint')}</p>
            <Suspense fallback={<MapFallback />}>
              <MapPicker address={form.address} lat={form.geo.lat} lng={form.geo.lng}
                onChange={({ lat, lng, address }) => setForm({ ...form, address, geo: { lat, lng } })} />
            </Suspense>
            <input placeholder={t('parentPhoneLabel')} value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            {form.parentPhone && (
              <PasswordInput placeholder={t('parentPasswordLabel')} value={form.parentPassword} onChange={e => setForm({ ...form, parentPassword: e.target.value })}
                className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            )}
            {form.parentPhone && <p className='text-xs text-muted -mt-1'>{t('parentInfoOptionalHint')}</p>}
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('createStudentBtn')}</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={t('editStudentModalTitle', { name: editing.name })} onClose={() => setEditing(null)}>
          <form onSubmit={submitEdit} className='flex flex-col gap-3'>
            <input placeholder={t('fullName')} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('phoneNumber')} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <PasswordInput placeholder={t('newPasswordOptional')} value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            <div>
              <label className='text-xs text-muted mb-1 block'>{t('dateOfBirthLabel')}</label>
              <DatePicker withYearSelect value={editForm.dateOfBirth} onChange={(v) => setEditForm({ ...editForm, dateOfBirth: v })} />
            </div>
            <input
              placeholder={settings?.passportRequired === false ? t('passportIdInfoOptional') : t('passportIdInfo')}
              value={editForm.passportInfo}
              onChange={e => setEditForm({ ...editForm, passportInfo: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline'
              required={settings?.passportRequired !== false}
            />
            <Suspense fallback={<MapFallback />}>
              <MapPicker address={editForm.address} lat={editForm.geo?.lat} lng={editForm.geo?.lng}
                onChange={({ lat, lng, address }) => setEditForm({ ...editForm, address, geo: { lat, lng } })} />
            </Suspense>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('saveChanges')}</button>
          </form>
        </Modal>
      )}

      {payingStudent && (
        <Modal title={t('recordPaymentModalTitleFor', { name: payingStudent.name })} onClose={() => setPayingStudent(null)}>
          <form onSubmit={submitPayment} className='flex flex-col gap-3'>
            {/* confirmed spec: a payment is never for one particular course - no course/level picker
                here at all. It's a deposit into the student's one shared wallet; which course's debt
                it actually ends up settling is decided entirely by the backend's account-wide FIFO
                allocation, not by anything chosen in this form. */}
            {payingStudent.owed > 0 && (
              <div className='bg-accent-soft rounded-xl px-4 py-3 text-sm text-ink flex justify-between font-medium dark:bg-[#1E1B4B]'>
                <span>{t('amountDueLabel')}</span>
                <span className='font-mono'>{formatMoney(payingStudent.owed)}</span>
              </div>
            )}
            <input placeholder={t('amountLabel')} type='number' value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <Select value={paymentForm.method} onChange={(v) => setPaymentForm({ ...paymentForm, method: v })} placeholder={t('selectPaymentMethod')}
              options={[
                { value: 'cash', label: t('paymentMethodCash') },
                { value: 'bank_transfer', label: t('paymentMethodBankTransfer') },
                { value: 'card', label: t('paymentMethodCard') },
                { value: 'click', label: t('paymentMethodClick') },
                { value: 'payme', label: t('paymentMethodPayme') },
              ]} />
            <p className='text-xs text-muted'>{t('paymentCreditNote')}</p>
            <button type='submit' disabled={submittingPayment} className='py-3 rounded-xl bg-accent text-white font-medium disabled:opacity-50 dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>
              {submittingPayment ? t('recordingPayment') : t('confirmPaymentBtn')}
            </button>
          </form>
        </Modal>
      )}

      {printingPaymentId && <ReceiptModal paymentId={printingPaymentId} onClose={() => setPrintingPaymentId(null)} />}
    </div>
  )
}

export default Students
