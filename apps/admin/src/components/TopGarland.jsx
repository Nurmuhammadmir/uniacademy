import React, { useMemo } from 'react'

// a real pine-branch-and-ornaments garland across the very top of the viewport (replaces the old
// plain dot-strip) - generated, not hand-drawn needle-by-needle: a sine-wave "rope" baseline, dense
// needle clusters fanned off it every ~18px in 3 green shades for a fluffy (not flat) look, and a
// repeating ornament sequence (glass baubles with a glossy highlight, a pinecone, a holly sprig, a
// bow) hung at varying depths so it doesn't read as a mechanical repeat. All static SVG (nothing
// here re-renders per frame) - the only thing that actually animates is each light's own opacity
// (see .tg-light in index.css), which the browser's compositor handles, not layout/paint per tick.
const VIEW_W = 1400
const VIEW_H = 72
const BASE_Y = 20
const GREENS = ['#143524', '#1f5c3c', '#2f7d54']
const ropeY = (x) => BASE_Y + Math.sin(x / 150) * 7

const NeedleCluster = ({ x, seed }) => {
  const y = ropeY(x)
  const count = 6
  const needles = []
  for (let i = 0; i < count; i++) {
    const angle = -75 + (i * 150) / (count - 1) + (((seed * 7 + i * 3) % 10) - 5)
    const len = 13 + ((seed + i) % 4) * 2.5
    const rad = (angle * Math.PI) / 180
    const x2 = x + Math.cos(rad) * len
    const y2 = y + Math.sin(rad) * len + 5
    needles.push(
      <line key={i} x1={x} y1={y} x2={x2} y2={y2}
        stroke={GREENS[(seed + i) % GREENS.length]} strokeWidth={seed % 3 === 0 ? 1.9 : 1.4} strokeLinecap='round' />
    )
  }
  return <g>{needles}</g>
}

const SnowTip = ({ x, seed }) => {
  const y = ropeY(x)
  if (seed % 3 !== 0) return null
  const angle = -40 + ((seed * 11) % 80)
  const rad = (angle * Math.PI) / 180
  const tx = x + Math.cos(rad) * 15
  const ty = y + Math.sin(rad) * 15 + 5
  return <circle cx={tx} cy={ty} r='1.3' fill='#ffffff' opacity='0.85' />
}

const GlassBauble = ({ x, y, color, gradId }) => (
  <g>
    <line x1={x} y1={y - 10} x2={x} y2={y - 2} stroke='#8a8a8a' strokeWidth='0.8' />
    <rect x={x - 2.2} y={y - 12} width='4.4' height='3' rx='1' fill='#b8b8b8' />
    <circle cx={x} cy={y + 7} r='8' fill={`url(#${gradId})`} />
    <ellipse cx={x - 3} cy={y + 4} rx='2.2' ry='3.2' fill='#ffffff' opacity='0.55' />
  </g>
)

const PineCone = ({ x, y }) => (
  <g>
    <line x1={x} y1={y - 9} x2={x} y2={y - 1} stroke='#6b4226' strokeWidth='1' />
    <ellipse cx={x} cy={y + 9} rx='5.5' ry='9' fill='#7a4a28' />
    {[0, 1, 2, 3].map(row => (
      <g key={row}>
        <path d={`M ${x - 4} ${y + 4 + row * 3.6} q 4 2 8 0`} stroke='#5c3419' strokeWidth='0.8' fill='none' />
      </g>
    ))}
  </g>
)

const Holly = ({ x, y }) => (
  <g>
    <path d={`M ${x - 6} ${y} q 2 -8 6 -6 q 1 5 -2 7 Z`} fill='#1f5c3c' />
    <path d={`M ${x + 6} ${y} q -2 -8 -6 -6 q -1 5 2 7 Z`} fill='#2f7d54' />
    <circle cx={x - 2} cy={y + 3} r='2.2' fill='#c62839' />
    <circle cx={x + 2.2} cy={y + 4} r='2' fill='#d7263d' />
    <circle cx={x} cy={y + 6.5} r='1.8' fill='#c62839' />
  </g>
)

const Bow = ({ x, y }) => (
  <g>
    <path d={`M ${x} ${y} q -9 -7 -11 1 q -1 6 11 1 Z`} fill='#d4af37' />
    <path d={`M ${x} ${y} q 9 -7 11 1 q 1 6 -11 1 Z`} fill='#c9a227' />
    <circle cx={x} cy={y + 1} r='2.2' fill='#9a7b1e' />
  </g>
)

// a warm light, glowing when lit (filter + blur defined once in <defs>) - opacity twinkle is pure
// CSS (.tg-light), staggered per-light via animationDelay so they flicker out of sync, not in unison
const Light = ({ x, y, color, delay }) => (
  <circle className='tg-light' cx={x} cy={y} r='3' fill={color} filter='url(#tgGlow)' style={{ animationDelay: `${delay}s` }} />
)

const ORNAMENT_SEQUENCE = ['bauble-red', 'pinecone', 'bauble-gold', 'holly', 'bauble-blue', 'bow']
const BAUBLE_COLORS = { 'bauble-red': ['#d7263d', '#8f1626'], 'bauble-gold': ['#f0c75e', '#9a7b1e'], 'bauble-blue': ['#4f7cff', '#1e3a99'] }

const TopGarland = () => {
  const { needleXs, ornaments, lights } = useMemo(() => {
    const needleXs = []
    for (let x = 10; x < VIEW_W; x += 17) needleXs.push(x)

    const ornaments = []
    let oi = 0
    for (let x = 50; x < VIEW_W; x += 95) {
      const type = ORNAMENT_SEQUENCE[oi % ORNAMENT_SEQUENCE.length]
      const y = ropeY(x) + 6 + (oi % 2) * 4
      ornaments.push({ type, x, y, oi })
      oi++
    }

    const lights = []
    for (let x = 25; x < VIEW_W; x += 46) {
      const colors = ['#ffd27a', '#ffb347', '#ffe6a8']
      lights.push({ x, y: ropeY(x) + 2, color: colors[lights.length % colors.length], delay: (lights.length % 7) * 0.3 })
    }

    return { needleXs, ornaments, lights }
  }, [])

  return (
    <svg className='new-year-top-garland' viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio='none'
      style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden='true'>
      <defs>
        <filter id='tgGlow' x='-200%' y='-200%' width='500%' height='500%'>
          <feGaussianBlur stdDeviation='3.2' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
        {Object.entries(BAUBLE_COLORS).map(([key, [light, dark]]) => (
          <radialGradient key={key} id={`tg-${key}`} cx='35%' cy='30%' r='75%'>
            <stop offset='0%' stopColor='#ffffff' stopOpacity='0.85' />
            <stop offset='40%' stopColor={light} />
            <stop offset='100%' stopColor={dark} />
          </radialGradient>
        ))}
      </defs>

      {needleXs.map((x, i) => <NeedleCluster key={i} x={x} seed={i} />)}
      {needleXs.map((x, i) => <SnowTip key={`s${i}`} x={x} seed={i} />)}

      {ornaments.map(o => {
        if (o.type === 'pinecone') return <PineCone key={o.oi} x={o.x} y={o.y} />
        if (o.type === 'holly') return <Holly key={o.oi} x={o.x} y={o.y} />
        if (o.type === 'bow') return <Bow key={o.oi} x={o.x} y={o.y} />
        return <GlassBauble key={o.oi} x={o.x} y={o.y} gradId={`tg-${o.type}`} />
      })}

      {lights.map((l, i) => <Light key={i} x={l.x} y={l.y} color={l.color} delay={l.delay} />)}
    </svg>
  )
}

export default TopGarland
