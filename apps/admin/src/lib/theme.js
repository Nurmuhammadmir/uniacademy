// Selectable accent-color theme, same "plain module applied at import time + persisted to
// localStorage" pattern as fontScale.js. accent/accent-soft are wired in tailwind.config.js to
// resolve to var(--accent)/var(--accent-soft), so switching the theme just re-points those two CSS
// custom properties on the root element - every `bg-accent`/`text-accent`/`bg-accent-soft` class
// anywhere in the app picks it up instantly with zero per-component changes.
//
// Timetable's per-language group-card colors (Timetable.jsx's colorForLanguage/CARD_COLORS) are a
// completely separate hash-based system applied via inline `style`, never referencing these
// variables - so they're already unaffected by whichever theme is picked here, by construction.
const KEY = 'uniacademy_admin_theme'

export const THEMES = {
    blue: { label: 'Blue', accent: '#2F6FED', soft: '#E4ECFD' },
    green: { label: 'Green', accent: '#1F9D55', soft: '#DFF5E6' },
    violet: { label: 'Violet', accent: '#7C3AED', soft: '#EDE4FD' },
    red: { label: 'Red', accent: '#DC2626', soft: '#FBE0E0' },
    pink: { label: 'Pink', accent: '#DB2777', soft: '#FBE5EF' },
    orange: { label: 'Orange', accent: '#EA580C', soft: '#FDE7D9' },
    teal: { label: 'Teal', accent: '#0D9488', soft: '#DAF4F1' },
}

export const getTheme = () => {
    const stored = localStorage.getItem(KEY)
    return stored && THEMES[stored] ? stored : 'blue'
}

export const setTheme = (name) => {
    const key = THEMES[name] ? name : 'blue'
    const { accent, soft } = THEMES[key]
    document.documentElement.style.setProperty('--accent', accent)
    document.documentElement.style.setProperty('--accent-soft', soft)
    localStorage.setItem(KEY, key)
    return key
}

setTheme(getTheme())
