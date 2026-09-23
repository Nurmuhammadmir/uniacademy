import React, { useState } from 'react'
import { Delete, ChevronDown, ChevronRight, Calculator as CalculatorIcon } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'

// remembered across pages (Sidebar stays mounted through navigation) and across reloads - open once
// and it stays open everywhere until you collapse it again; starts collapsed for anyone who's never
// touched it (a fresh browser/profile has no key yet, and the `=== 'true'` check reads that as closed)
const STORAGE_KEY = 'shanti_calc_open'

const MAX_DIGITS = 12

const OPS = {
  '+': (a, b) => a + b,
  '−': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => b === 0 ? null : a / b,
}

// trims the float garbage repeated +/-/×/÷ chains leave behind (0.1+0.2 -> 0.30000000000000004)
const cleanNumber = (n) => Math.round(n * 1e8) / 1e8

// comma-groups the integer part for on-screen legibility only - the underlying state stays a plain
// numeric string so digit-by-digit typing never has to fight formatting
const formatDisplay = (str) => {
  const neg = str.startsWith('-')
  const body = neg ? str.slice(1) : str
  const [intPart, decPart] = body.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (neg ? '-' : '') + grouped + (decPart !== undefined ? '.' + decPart : '')
}

const CalcBtn = ({ onClick, className = '', children }) => (
  <button type='button' onClick={onClick} className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center ${className}`}>
    {children}
  </button>
)

// pocket calculator embedded in the sidebar itself (rather than a page you navigate to) - it lives
// in the leftover vertical space nav's flex-1 already leaves below the last link, above Settings,
// so it's reachable from every screen without losing your place. No keyboard shortcuts here (unlike
// a dedicated calculator page would have) - this is mounted app-wide for as long as you're logged
// in, so a global keydown listener would hijack digit/operator keys everywhere, not just here.
const SidebarCalculator = () => {
  const { t } = useLanguage()
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true')
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState(null)
  const [operator, setOperator] = useState(null)
  const [overwrite, setOverwrite] = useState(true)
  const [error, setError] = useState(false)

  const inputDigit = (d) => {
    if (error) { setError(false); setDisplay(d); setOverwrite(false); return }
    if (overwrite) { setDisplay(d); setOverwrite(false); return }
    if (display === '0') { setDisplay(d); return }
    if (display.replace(/[-.]/g, '').length >= MAX_DIGITS) return
    setDisplay(display + d)
  }

  const inputDecimal = () => {
    if (error) { setError(false); setDisplay('0.'); setOverwrite(false); return }
    if (overwrite) { setDisplay('0.'); setOverwrite(false); return }
    if (!display.includes('.')) setDisplay(display + '.')
  }

  const chooseOperator = (op) => {
    if (error) return
    const current = cleanNumber(parseFloat(display))
    if (operator && !overwrite) {
      const result = OPS[operator](previousValue, current)
      if (result === null) { setError(true); setDisplay(t('calcErrorLabel')); setOperator(null); setPreviousValue(null); return }
      const cleaned = cleanNumber(result)
      setDisplay(String(cleaned))
      setPreviousValue(cleaned)
    } else {
      setPreviousValue(current)
    }
    setOperator(op)
    setOverwrite(true)
  }

  const equals = () => {
    if (error || operator === null || previousValue === null) return
    const current = cleanNumber(parseFloat(display))
    const result = OPS[operator](previousValue, current)
    if (result === null) { setError(true); setDisplay(t('calcErrorLabel')); setOperator(null); setPreviousValue(null); return }
    setDisplay(String(cleanNumber(result)))
    setPreviousValue(null)
    setOperator(null)
    setOverwrite(true)
  }

  const clearAll = () => {
    setDisplay('0'); setPreviousValue(null); setOperator(null); setOverwrite(true); setError(false)
  }

  const backspace = () => {
    if (error) { clearAll(); return }
    if (overwrite) return
    setDisplay(prev => (prev.length <= 1 || (prev.length === 2 && prev.startsWith('-'))) ? '0' : prev.slice(0, -1))
  }

  const toggleSign = () => {
    if (error) return
    setDisplay(prev => prev === '0' ? prev : (prev.startsWith('-') ? prev.slice(1) : '-' + prev))
  }

  const percent = () => {
    if (error) return
    setDisplay(String(cleanNumber(parseFloat(display) / 100)))
  }

  const opClass = (op) => operator === op && overwrite ? 'bg-accent text-white' : 'bg-accent-soft text-accent'
  const funcClass = 'bg-slate-100 text-slate-600'
  const digitClass = 'bg-slate-50 text-ink'

  const toggleOpen = () => {
    const next = !open
    localStorage.setItem(STORAGE_KEY, String(next))
    setOpen(next)
  }

  return (
    <div>
      <button type='button' onClick={toggleOpen}
        className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors ${open
          ? 'bg-accent-soft text-accent font-semibold tracking-tight'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'}`}>
        <CalculatorIcon size={20} strokeWidth={1.75} className='w-5 h-5 flex-shrink-0' />
        <span className='flex-1 text-left'>{t('navCalculator')}</span>
        {open ? <ChevronDown size={16} strokeWidth={1.75} className='flex-shrink-0' /> : <ChevronRight size={16} strokeWidth={1.75} className='flex-shrink-0' />}
      </button>

      {open && (
        <div className='rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 mt-1.5'>
          <div className='bg-[#1D1D1F] rounded-lg px-2.5 py-2 mb-2 text-right overflow-hidden'>
            <p className='text-white font-mono text-lg font-semibold truncate'>{error ? display : formatDisplay(display)}</p>
          </div>
          <div className='grid grid-cols-4 gap-1'>
            <CalcBtn onClick={clearAll} className={funcClass}>{display === '0' && !operator && !error ? 'AC' : 'C'}</CalcBtn>
            <CalcBtn onClick={toggleSign} className={funcClass}>±</CalcBtn>
            <CalcBtn onClick={percent} className={funcClass}>%</CalcBtn>
            <CalcBtn onClick={() => chooseOperator('÷')} className={opClass('÷')}>÷</CalcBtn>

            <CalcBtn onClick={() => inputDigit('7')} className={digitClass}>7</CalcBtn>
            <CalcBtn onClick={() => inputDigit('8')} className={digitClass}>8</CalcBtn>
            <CalcBtn onClick={() => inputDigit('9')} className={digitClass}>9</CalcBtn>
            <CalcBtn onClick={() => chooseOperator('×')} className={opClass('×')}>×</CalcBtn>

            <CalcBtn onClick={() => inputDigit('4')} className={digitClass}>4</CalcBtn>
            <CalcBtn onClick={() => inputDigit('5')} className={digitClass}>5</CalcBtn>
            <CalcBtn onClick={() => inputDigit('6')} className={digitClass}>6</CalcBtn>
            <CalcBtn onClick={() => chooseOperator('−')} className={opClass('−')}>−</CalcBtn>

            <CalcBtn onClick={() => inputDigit('1')} className={digitClass}>1</CalcBtn>
            <CalcBtn onClick={() => inputDigit('2')} className={digitClass}>2</CalcBtn>
            <CalcBtn onClick={() => inputDigit('3')} className={digitClass}>3</CalcBtn>
            <CalcBtn onClick={() => chooseOperator('+')} className={opClass('+')}>+</CalcBtn>

            <CalcBtn onClick={backspace} className={funcClass}><Delete size={13} strokeWidth={1.75} /></CalcBtn>
            <CalcBtn onClick={() => inputDigit('0')} className={digitClass}>0</CalcBtn>
            <CalcBtn onClick={inputDecimal} className={digitClass}>.</CalcBtn>
            <CalcBtn onClick={equals} className='bg-accent text-white'>=</CalcBtn>
          </div>
        </div>
      )}
    </div>
  )
}

export default SidebarCalculator
