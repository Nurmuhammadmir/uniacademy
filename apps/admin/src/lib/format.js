// comma-separated thousands (500,000, 1,200,000) regardless of the browser's locale settings -
// .toLocaleString() without an explicit locale can render commas, dots, or nothing depending on
// the user's OS/browser, so this guarantees a consistent, easily-readable format everywhere money
// is shown across the app.
export const formatMoney = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// a payment's real remaining (net) value - `refunded: true` always means net 0, even on legacy rows
// recorded before partial refunds existed (their refundedAmount stayed 0 and was never backfilled,
// so naively trusting it would show the full original amount as still owed/counted)
export const remainingAmount = (payment) => payment.refunded ? 0 : payment.amount - (payment.refundedAmount || 0)

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'click']

export const paymentMethodLabelKey = (method) => ({
    cash: 'paymentMethodCash',
    bank_transfer: 'paymentMethodBankTransfer',
    card: 'paymentMethodCard',
    click: 'paymentMethodClick',
    payme: 'paymentMethodPayme',
}[method] || 'paymentMethodUnrecorded')

// a group's display label - its admin-given name if one was set, otherwise the language·level
// composite every group used to be identified by exclusively. A group can legitimately have no
// level at all (a course with zero levels defined) - drop the trailing " · " instead of showing it
// with nothing after it.
export const groupLabel = (g) => g?.name || `${g?.languageId?.name || ''}${g?.levelId?.name ? ' · ' + g.levelId.name : ''}`

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// schedulePattern is stored as a fixed English constant ('MON_WED_FRI'/'TUE_THU_SAT'/'CUSTOM') -
// every page that showed it via `pattern.replaceAll('_', '/')` was displaying that literal English
// string regardless of which language the admin had the UI set to. This is the one place that
// actually translates it, reusing the same oddDaysTab/evenDaysTab labels the schedule-pattern
// picker itself already uses, so a group created as "MON_WED_FRI" reads as "Toq kunlar" in Uzbek,
// "Нечётные дни" in Russian, etc - not stuck in English everywhere else it's displayed.
export const scheduleDaysLabel = (group, t) => {
    if (group?.schedulePattern === 'CUSTOM') {
        // some callers (e.g. the Salary detail breakdown) only carry a summarized group shape
        // without customDays - fall back to the generic "Other" label rather than showing nothing
        if (!group.customDays || group.customDays.length === 0) return t('otherDaysTab')
        return [...group.customDays].sort((a, b) => a - b).map(d => t('weekday_' + WEEKDAY_KEYS[d]).slice(0, 3)).join('/')
    }
    if (group?.schedulePattern === 'MON_WED_FRI') return t('oddDaysTab')
    if (group?.schedulePattern === 'TUE_THU_SAT') return t('evenDaysTab')
    return group?.schedulePattern || ''
}
