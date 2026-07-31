// space-separated thousands (500 000, 1 200 000) regardless of the browser's locale settings -
// .toLocaleString() without an explicit locale can render commas, dots, or nothing depending on
// the user's OS/browser, so this guarantees a consistent, easily-readable format everywhere money
// is shown across the app.
export const formatMoney = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// a payment's real remaining (net) value - `refunded: true` always means net 0, even on legacy rows
// recorded before partial refunds existed (their refundedAmount stayed 0 and was never backfilled)
export const remainingAmount = (payment) => payment.refunded ? 0 : payment.amount - (payment.refundedAmount || 0)

export const paymentMethodLabelKey = (method) => ({
    cash: 'paymentMethodCash',
    bank_transfer: 'paymentMethodBankTransfer',
    card: 'paymentMethodCard',
    click: 'paymentMethodClick',
}[method] || 'paymentMethodUnrecorded')

// a group's display label - its admin-given name if one was set, otherwise the language·level
// composite every group used to be identified by exclusively
export const groupLabel = (g) => g?.name || `${g?.languageId?.name || ''} · ${g?.levelId?.name || ''}`
