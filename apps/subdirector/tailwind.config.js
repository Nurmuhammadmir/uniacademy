import sharedPreset from '../../packages/tailwind-preset/index.js'
/** @type {import('tailwindcss').Config} */
export default {
    // 'class' (not the OS-preference-only 'media' default) so dark mode here can only ever activate
    // once this app grows an actual toggle that adds a `dark` class somewhere (see the admin app's
    // ThemeContext.jsx for that whole pattern) - not silently, just because a visitor's OS happens to
    // be set to dark. Safe to turn on now even before that toggle exists: with nothing anywhere in
    // this app ever adding the `dark` class yet, every `dark:` utility stays completely inert.
    darkMode: 'class',
    presets: [sharedPreset],
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                accent: '#4B4FE0', 'accent-soft': '#E6E6FB', gold: '#C9A15C',
                // overridden here from the shared preset's static hex values so Dark Mode can repaint
                // every page's base surfaces (bg-bg, bg-bg-elevated, bg-card, text-ink, text-muted,
                // border-hairline - already used throughout this app) just by flipping the `dark`
                // class on <html>, with zero className changes at any existing call site. Actual
                // light/dark hex values live in src/index.css - same pattern as the admin app.
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
