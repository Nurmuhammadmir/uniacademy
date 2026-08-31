import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sliders } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import TimePicker from '../components/TimePicker.jsx'
import DatePicker from '../components/DatePicker.jsx'
import { todayISO } from '../lib/date.js'

const DAY_START_MIN = 8 * 60
const DAY_END_MIN = 22 * 60
const SLOT_MIN = 30
const TOTAL_SLOTS = (DAY_END_MIN - DAY_START_MIN) / SLOT_MIN
const CELL_PX = 40
const ROOM_SIZE_PX = 210
const ROOM_COL_PX = 320
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const CARD_COLORS = ['#F2542D', '#3E7CB1', '#2E8B57', '#8E44AD', '#D6497A', '#B7950B', '#16A085', '#C0392B']

const timeToMinutes = (time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m }
const minutesToTime = (mins) => `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
const colorForLanguage = (id) => {
  let hash = 0
  const s = String(id || '')
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return CARD_COLORS[hash % CARD_COLORS.length]
}
const dateLabel = (dateStr, locale) => dateStr ? new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : ''

// current wall-clock time in Asia/Tashkent (this app's canonical business timezone), rounded down
// to the slot it belongs in - so "9:22" resolves to the "9:00" row/column, matching the slot grid
const nowMinutesInTashkent = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
  const h = Number(parts.find(p => p.type === 'hour').value)
  const m = Number(parts.find(p => p.type === 'minute').value)
  return h * 60 + m
}

const TIME_LABELS = Array.from({ length: TOTAL_SLOTS }, (_, i) => minutesToTime(DAY_START_MIN + i * SLOT_MIN))

const BookingModal = ({ draft, groups, rooms, t, onSave, onUnassign, onClose, onGoToGroup }) => {
  const isEditing = !!draft.groupId
  const [groupId, setGroupId] = useState(draft.groupId || '')
  const [roomId, setRoomId] = useState(draft.roomId || '')
  const [schedulePattern, setSchedulePattern] = useState(draft.schedulePattern)
  const [customDays, setCustomDays] = useState(draft.customDays || [])
  const [startTime, setStartTime] = useState(draft.time || '08:00')
  const [endTime, setEndTime] = useState(minutesToTime(timeToMinutes(draft.time || '08:00') + (draft.durationMinutes || 90)))
  const [startDate, setStartDate] = useState(draft.startDate ? draft.startDate.slice(0, 10) : todayISO())
  const [endDate, setEndDate] = useState(draft.endDate ? draft.endDate.slice(0, 10) : '')

  const toggleCustomDay = (d) => setCustomDays(days => days.includes(d) ? days.filter(x => x !== d) : [...days, d])

  const availableGroups = groups.filter(g => g.status === 'active')

  const submit = async (e) => {
    e.preventDefault()
    // Select/TimePicker/DatePicker below replace native <select>/<input required> fields, which lets
    // a required-but-empty value slip past HTML5's own validation - guard here instead
    if (!groupId || !roomId) return
    const durationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime)
    if (durationMinutes <= 0) return
    await onSave({
      groupId, roomId, schedulePattern, customDays: schedulePattern === 'CUSTOM' ? customDays : [],
      time: startTime, durationMinutes, startDate, endDate: endDate || null,
    })
  }

  const groupLabel = (g) => {
    const label = g.name ? `${g.name} (${g.languageId?.name} · ${g.levelId?.name} · ${g.teacherId?.name})` : `${g.languageId?.name} · ${g.levelId?.name} · ${g.teacherId?.name}`
    if (g.roomId) return `${label} (${t('alreadyScheduledHint')})`
    return label
  }

  return (
    <Modal title={isEditing ? t('editBookingTitle') : t('newBookingTitle')} onClose={onClose}>
      <form onSubmit={submit} className='flex flex-col gap-3'>
        {isEditing ? (
          <div className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm text-ink'>
            {groupLabel(groups.find(g => g._id === groupId) || {})}
          </div>
        ) : (
          <Select value={groupId} onChange={setGroupId} placeholder={t('selectGroupLabel')}
            options={availableGroups.map(g => ({ value: g._id, label: groupLabel(g) }))} />
        )}

        <Select value={roomId} onChange={setRoomId} placeholder={t('roomLabel')}
          options={rooms.map(r => ({ value: r._id, label: r.name }))} />

        <Select value={schedulePattern} onChange={setSchedulePattern}
          options={[
            { value: 'MON_WED_FRI', label: t('oddDaysTab') },
            { value: 'TUE_THU_SAT', label: t('evenDaysTab') },
            { value: 'CUSTOM', label: t('otherDaysTab') },
          ]} />

        {schedulePattern === 'CUSTOM' && (
          <div className='flex gap-1 flex-wrap'>
            {WEEKDAY_KEYS.map((key, idx) => (
              <button type='button' key={key} onClick={() => toggleCustomDay(idx)}
                className={`px-2 py-1 rounded-lg text-xs font-medium ${customDays.includes(idx) ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg border border-hairline text-muted'}`}>
                {t('weekday_' + key)}
              </button>
            ))}
          </div>
        )}

        <div className='flex gap-2'>
          <div className='flex-1'>
            <p className='text-muted text-xs mb-1'>{t('startTimeLabel')}</p>
            <TimePicker value={startTime} onChange={setStartTime} />
          </div>
          <div className='flex-1'>
            <p className='text-muted text-xs mb-1'>{t('endTimeLabel')}</p>
            <TimePicker value={endTime} onChange={setEndTime} />
          </div>
        </div>

        <div className='flex gap-2'>
          <div className='flex-1'>
            <p className='text-muted text-xs mb-1'>{t('courseStartDateLabel')}</p>
            <DatePicker value={startDate} onChange={setStartDate} />
          </div>
          <div className='flex-1'>
            <p className='text-muted text-xs mb-1'>{t('courseEndDateLabel')}</p>
            <DatePicker value={endDate} onChange={setEndDate} />
          </div>
        </div>

        <button type='submit' className='py-2 rounded-lg bg-accent text-white text-sm font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('save')}</button>
        {isEditing && (
          <div className='flex gap-2'>
            <button type='button' onClick={() => onGoToGroup(groupId)} className='flex-1 py-2 rounded-lg bg-bg-elevated border border-hairline text-ink text-sm'>{t('goToGroupBtn')}</button>
            <button type='button' onClick={() => onUnassign(groupId)} className='flex-1 py-2 rounded-lg bg-bg-elevated border border-hairline text-muted text-sm'>{t('unassignBtn')}</button>
          </div>
        )}
      </form>
    </Modal>
  )
}

const GroupCard = ({ group, vertical, onClick, onDragStart, locale, t }) => {
  const startMin = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, timeToMinutes(group.time)))
  const offsetSlots = (startMin - DAY_START_MIN) / SLOT_MIN
  const spanSlots = Math.max(1, Math.min(TOTAL_SLOTS - offsetSlots, (group.durationMinutes || 90) / SLOT_MIN))
  const color = colorForLanguage(group.languageId?._id)

  const posStyle = vertical
    ? { position: 'absolute', top: offsetSlots * CELL_PX, left: 2, right: 2, height: spanSlots * CELL_PX - 2, zIndex: 10 }
    : { position: 'absolute', left: offsetSlots * CELL_PX, top: 2, bottom: 2, width: spanSlots * CELL_PX - 2, zIndex: 10 }

  return (
    <button
      draggable
      onDragStart={e => onDragStart(e, group._id)}
      onClick={() => onClick(group)}
      style={{ ...posStyle, backgroundColor: color }}
      className='timetable-card rounded-lg p-2 text-left text-white overflow-hidden shadow-sm cursor-grab active:cursor-grabbing'
    >
      <div className='flex justify-between items-start gap-1'>
        <span className='text-[10px] px-1 py-0.5 rounded bg-black/20 whitespace-nowrap'>{group.levelId?.name}</span>
        <span className='text-[10px] whitespace-nowrap'>{group.studentIds?.length || 0} {t('studentCountSuffix')}</span>
      </div>
      <p className='text-xs font-medium truncate leading-tight mt-0.5'>{group.name || `${group.languageId?.name} ${group.teacherId?.name}`}</p>
      <p className='text-[10px] opacity-80 truncate'>{dateLabel(group.startDate, locale)}—{dateLabel(group.endDate, locale)}</p>
    </button>
  )
}

const Timetable = () => {
  const { groups, rooms, createRoom, updateRoom, deleteRoom, updateGroup } = useContext(AdminContext)
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const locale = { en: 'en', ru: 'ru', uz: 'uz', kaa: 'uz' }[lang] || 'en'

  const [dayFilter, setDayFilter] = useState('MON_WED_FRI')
  const [vertical, setVertical] = useState(true)
  const [showRooms, setShowRooms] = useState(false)
  const [roomForm, setRoomForm] = useState({ name: '', capacity: 20 })
  const [editingRoom, setEditingRoom] = useState(null)
  const [draft, setDraft] = useState(null)
  const scrollRef = useRef(null)

  // on load (and whenever orientation flips), scroll so the current half-hour slot sits at the top
  // of the visible area instead of always starting the day at 08:00
  useEffect(() => {
    if (!scrollRef.current || rooms.length === 0) return
    const nowMin = nowMinutesInTashkent()
    const rounded = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, Math.floor(nowMin / SLOT_MIN) * SLOT_MIN))
    const offsetPx = ((rounded - DAY_START_MIN) / SLOT_MIN) * CELL_PX
    if (vertical) scrollRef.current.scrollTop = offsetPx
    else scrollRef.current.scrollLeft = offsetPx
  }, [rooms.length > 0, vertical])

  const visibleGroups = useMemo(
    () => groups.filter(g => g.status === 'active' && g.schedulePattern === dayFilter && g.roomId),
    [groups, dayFilter],
  )

  const submitRoom = async (e) => {
    e.preventDefault()
    if (editingRoom) {
      const ok = await updateRoom(editingRoom._id, roomForm)
      if (ok) { setEditingRoom(null); setRoomForm({ name: '', capacity: 20 }) }
    } else {
      const ok = await createRoom(roomForm)
      if (ok) setRoomForm({ name: '', capacity: 20 })
    }
  }
  const startEditRoom = (room) => { setEditingRoom(room); setRoomForm({ name: room.name, capacity: room.capacity }) }
  const removeRoom = async (id) => { await deleteRoom(id) }

  const openCreate = (roomId, time) => setDraft({ roomId, time, schedulePattern: dayFilter, customDays: [], durationMinutes: 90, startDate: todayISO(), endDate: null })
  const openEdit = (group) => setDraft({
    groupId: group._id, roomId: group.roomId?._id || group.roomId, schedulePattern: group.schedulePattern,
    customDays: group.customDays, time: group.time, durationMinutes: group.durationMinutes,
    startDate: group.startDate, endDate: group.endDate,
  })

  const handleSave = async (payload) => {
    const ok = await updateGroup(payload.groupId, {
      roomId: payload.roomId, schedulePattern: payload.schedulePattern, customDays: payload.customDays,
      time: payload.time, durationMinutes: payload.durationMinutes, startDate: payload.startDate, endDate: payload.endDate,
    })
    if (ok) setDraft(null)
  }

  const handleUnassign = async (groupId) => {
    const ok = await updateGroup(groupId, { roomId: null })
    if (ok) setDraft(null)
  }

  const handleGoToGroup = (groupId) => navigate('/groups/' + groupId)

  const handleDrop = (e, roomId) => {
    e.preventDefault()
    const groupId = e.dataTransfer.getData('text/plain')
    if (!groupId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetPx = vertical ? (e.clientY - rect.top) : (e.clientX - rect.left)
    const slotIndex = Math.max(0, Math.min(TOTAL_SLOTS - 1, Math.floor(offsetPx / CELL_PX)))
    const newTime = minutesToTime(DAY_START_MIN + slotIndex * SLOT_MIN)
    updateGroup(groupId, { roomId, time: newTime }, true)
  }

  const trackSizePx = TOTAL_SLOTS * CELL_PX

  return (
    <div>
      <div className='flex justify-between items-center mb-4 flex-wrap gap-2'>
        <div className='flex gap-1 bg-bg-elevated border border-hairline rounded-lg p-1'>
          {[['MON_WED_FRI', 'oddDaysTab'], ['TUE_THU_SAT', 'evenDaysTab'], ['CUSTOM', 'otherDaysTab']].map(([value, key]) => (
            <button key={value} onClick={() => setDayFilter(value)}
              className={`plain px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${dayFilter === value ? 'bg-slate-100 dark:bg-slate-800/40 text-[#1D1D1F] dark:text-[#F8FAFC] font-semibold' : 'text-slate-500 dark:text-[#94A3B8] hover:text-[#1D1D1F] dark:hover:text-[#F8FAFC]'}`}>
              {t(key)}
            </button>
          ))}
        </div>

        <p className='font-display text-xl text-ink'>{t('navTimetable')}</p>

        <div className='flex gap-2 items-center'>
          <button onClick={() => setShowRooms(true)} className='px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-sm font-medium flex items-center gap-2 transition-colors dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none'>
            <Sliders size={14} /> {t('manageRoomsBtn')}
          </button>
          <button onClick={() => setVertical(v => !v)} className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-sm font-medium transition-colors dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none'>
            {t('verticalToggleLabel')}
            <span className={`w-8 h-4 rounded-full relative transition-colors ${vertical ? 'bg-accent dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${vertical ? 'left-4' : 'left-0.5'}`} />
            </span>
          </button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <p className='text-muted'>{t('noRoomsYet')}</p>
      ) : (
        <div ref={scrollRef} className='slim-scrollbar w-full bg-white dark:bg-[#161F30] border border-slate-100 dark:border-slate-800/80 rounded-xl shadow-sm overflow-auto' style={{ maxHeight: '75vh' }}>
          {vertical ? (
            <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${rooms.length}, ${ROOM_COL_PX}px)`, width: `${60 + rooms.length * ROOM_COL_PX}px` }}>
              <div className='sticky top-0 left-0 z-30 bg-slate-50/50 dark:bg-slate-800/40 border-b border-r border-slate-100 dark:border-slate-800/80' />
              {rooms.map(room => (
                <div key={room._id} className='sticky top-0 z-20 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 px-2 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 text-center'>
                  {room.name}
                </div>
              ))}

              <div className='sticky left-0 z-20 bg-white dark:bg-[#161F30] border-r border-slate-100 dark:border-slate-800/80'>
                {TIME_LABELS.map(time => (
                  <div key={time} style={{ height: CELL_PX }} className='text-xs text-slate-500 dark:text-[#94A3B8] font-medium flex items-start justify-end pr-2 pt-0.5 border-b border-slate-100 dark:border-slate-800/80'>{time}</div>
                ))}
              </div>

              {rooms.map(room => (
                <div key={room._id} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, room._id)}
                  style={{ position: 'relative', height: trackSizePx }} className='border-r border-slate-100 dark:border-slate-800/80'>
                  {TIME_LABELS.map((time, i) => (
                    <button key={time} onClick={() => openCreate(room._id, time)}
                      style={{ position: 'absolute', top: i * CELL_PX, left: 0, right: 0, height: CELL_PX, zIndex: 0 }}
                      className='plain border-b border-slate-100 dark:border-slate-800/80 hover:bg-blue-50/40 dark:hover:bg-blue-500/10' />
                  ))}
                  {visibleGroups.filter(g => String(g.roomId?._id || g.roomId) === String(room._id)).map(g => (
                    <GroupCard key={g._id} group={g} vertical={vertical} onClick={openEdit}
                      onDragStart={(e, id) => e.dataTransfer.setData('text/plain', id)} locale={locale} t={t} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateRows: `40px repeat(${rooms.length}, ${ROOM_SIZE_PX}px)`, gridTemplateColumns: `120px ${trackSizePx}px` }}>
              <div className='sticky top-0 left-0 z-30 bg-slate-50/50 dark:bg-slate-800/40 border-b border-r border-slate-100 dark:border-slate-800/80' />
              <div className='sticky top-0 z-20 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 flex' style={{ width: trackSizePx }}>
                {TIME_LABELS.map(time => (
                  <div key={time} style={{ width: CELL_PX }} className='text-xs text-slate-500 dark:text-[#94A3B8] font-medium text-center border-r border-slate-100 dark:border-slate-800/80 py-1'>{time}</div>
                ))}
              </div>

              {rooms.map(room => (
                <React.Fragment key={room._id}>
                  <div className='sticky left-0 z-20 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-100 dark:border-slate-800/80 px-2 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center'>{room.name}</div>
                  <div onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, room._id)}
                    style={{ position: 'relative', width: trackSizePx }} className='border-b border-slate-100 dark:border-slate-800/80'>
                    {TIME_LABELS.map((time, i) => (
                      <button key={time} onClick={() => openCreate(room._id, time)}
                        style={{ position: 'absolute', left: i * CELL_PX, top: 0, bottom: 0, width: CELL_PX, zIndex: 0 }}
                        className='plain border-r border-slate-100 dark:border-slate-800/80 hover:bg-blue-50/40 dark:hover:bg-blue-500/10' />
                    ))}
                    {visibleGroups.filter(g => String(g.roomId?._id || g.roomId) === String(room._id)).map(g => (
                      <GroupCard key={g._id} group={g} vertical={vertical} onClick={openEdit}
                        onDragStart={(e, id) => e.dataTransfer.setData('text/plain', id)} locale={locale} t={t} />
                    ))}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {draft && (
        <BookingModal draft={draft} groups={groups} rooms={rooms}
          t={t} onSave={handleSave} onUnassign={handleUnassign} onGoToGroup={handleGoToGroup} onClose={() => setDraft(null)} />
      )}

      {showRooms && (
        <Modal title={t('manageRoomsBtn')} onClose={() => { setShowRooms(false); setEditingRoom(null); setRoomForm({ name: '', capacity: 20 }) }}>
          <form onSubmit={submitRoom} className='flex gap-2 mb-4'>
            <input placeholder={t('roomNameLabel')} value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
              className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            <input type='number' min='1' placeholder={t('capacityPlaceholder')} value={roomForm.capacity}
              onChange={e => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
              className='w-24 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>
              {editingRoom ? t('save') : t('add')}
            </button>
          </form>
          <div className='flex flex-col gap-2'>
            {rooms.map(r => (
              <div key={r._id} className='flex justify-between items-center bg-bg border border-hairline rounded-lg px-3 py-2 text-sm'>
                <span className='text-ink'>{r.name} · {r.capacity}</span>
                <span className='flex gap-3'>
                  <button onClick={() => startEditRoom(r)} className='text-accent text-xs'>{t('edit')}</button>
                  <button onClick={() => removeRoom(r._id)} className='text-muted text-xs'>{t('removeBtn')}</button>
                </span>
              </div>
            ))}
            {rooms.length === 0 && <p className='text-muted text-sm'>{t('noRoomsYet')}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Timetable
