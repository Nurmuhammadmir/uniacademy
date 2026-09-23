// comma-separated thousands regardless of browser locale settings, suffixed with $ - every amount
// in Shanti is tracked in USD
export const formatMoney = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    const rounded = Math.round(n)
    const sign = rounded < 0 ? '-' : ''
    const digits = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return `${sign}${digits}$`
}

// caps to 2 decimal places (trimming trailing zeros) and comma-groups the integer part - summed
// quantities otherwise carry raw floating-point noise (e.g. 203220.65000000005)
export const formatQuantity = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    const rounded = Math.round(n * 100) / 100
    const [intPart, decPart] = rounded.toString().split('.')
    const sign = intPart.startsWith('-') ? '-' : ''
    const digits = (sign ? intPart.slice(1) : intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return decPart ? `${sign}${digits}.${decPart}` : `${sign}${digits}`
}
