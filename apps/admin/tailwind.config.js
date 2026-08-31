import sharedPreset from '../../packages/tailwind-preset/index.js'
/** @type {import('tailwindcss').Config} */
export default {
    // class-based (not the OS-preference-only 'media' strategy) so the header toggle can force
    // light/dark regardless of the device setting, and so the choice persists via localStorage
    // (see src/context/ThemeContext.jsx) instead of ever following the OS.
    darkMode: 'class',
    presets: [sharedPreset],
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                // wired to CSS custom properties (see src/lib/theme.js + src/index.css :root defaults) so
                // the accent color is switchable at runtime from a theme picker, instead of a fixed build-time hex
                accent: 'var(--accent)',
                'accent-soft': 'var(--accent-soft)',
                // overridden here from the shared preset's static hex values so Dark Mode can repaint
                // every page's base surfaces (bg-bg, bg-bg-elevated, bg-card, text-ink, text-muted,
                // border-hairline - already used throughout this app) just by flipping the `dark` class
                // on <html>, with zero className changes at any of those existing call sites. Actual
                // light/dark hex values live in src/index.css.
                bg: 'var(--color-bg)',
                'bg-elevated': 'var(--color-bg-elevated)',
                'bg-card': 'var(--color-bg-card)',
                ink: 'var(--color-ink)',
                muted: 'var(--color-muted)',
                hairline: 'var(--color-hairline)',
            },
        },
    },
}
