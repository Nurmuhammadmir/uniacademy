// comma-groups the integer part and trims only trailing zeros - never rounds away real precision.
// `precisionMultiplier` is the one cleanup still applied: it clamps to a fixed number of decimals
// purely to strip IEEE-754 floating-point representation noise that repeated +/- leaves behind (e.g.
// a true 203220.65 total surfacing as 203220.65000000005), not to discard real digits.
const formatNumber = (n, precisionMultiplier) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    const rounded = Math.round(n * precisionMultiplier) / precisionMultiplier
    const [intPart, decPart] = rounded.toString().split('.')
    const sign = intPart.startsWith('-') ? '-' : ''
    const digits = (sign ? intPart.slice(1) : intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return decPart ? `${sign}${digits}.${decPart}` : `${sign}${digits}`
}

// quantities (kg, l, pcs...) aren't pinned to a fixed number of real decimals the way currency is, so
// the noise guard is loose (6 decimals) - high enough to never touch a genuinely-entered value, still
// enough to clear float summation garbage.
export const formatQuantity = (n) => formatNumber(n, 1e6)

// money is always exact to the cent - 2 decimals here isn't "rounding away" precision, it's the
// complete, correct value (there's no such thing as a sub-cent price or payment in Shanti). "$"
// suffix on top of formatNumber.
export const formatPrice = (n) => {
    const formatted = formatNumber(n, 100)
    return formatted === '—' ? formatted : `${formatted}$`
}

// used to round every amount to a whole dollar (hiding real cents, e.g. $1.85 shown as "2$"), which
// made totals not visibly add up to their line items - now identical to formatPrice. Kept as its own
// export only so the many existing <Money value=.../> call sites don't need to change.
export const formatMoney = formatPrice
