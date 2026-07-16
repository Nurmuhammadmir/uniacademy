// Global text-size control. Tailwind's default type scale (text-xs..text-6xl) is defined in rem,
// which is always relative to the ROOT element's font-size - not to whatever component it's
// nested inside. So scaling html's font-size scales every rem-based text size everywhere at once
// (vocab cards, buttons, nav, everything) with zero changes needed in any component.
const KEY = 'uniacademy_student_fontscale'
export const MIN_SCALE = 80
export const MAX_SCALE = 200

export const getFontScale = () => {
    const stored = Number(localStorage.getItem(KEY))
    return stored && stored >= MIN_SCALE && stored <= MAX_SCALE ? stored : 100
}

export const setFontScale = (percent) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(percent)))
    document.documentElement.style.fontSize = `${clamped}%`
    localStorage.setItem(KEY, String(clamped))
    return clamped
}

// applied immediately on import (before React mounts) so there's no flash of default-size content
setFontScale(getFontScale())
