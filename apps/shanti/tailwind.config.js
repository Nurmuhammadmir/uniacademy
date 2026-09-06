import sharedPreset from '../../packages/tailwind-preset/index.js'
/** @type {import('tailwindcss').Config} */
export default {
    // light-only for v1 (no dark mode / theme-picker requested) - the shared preset's bg/bg-elevated/
    // bg-card/ink/muted/hairline are already static hex values that work as-is without any of
    // apps/admin's CSS-variable indirection, which exists there only to support runtime dark-mode toggling.
    presets: [sharedPreset],
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                accent: '#0D9488',
                'accent-soft': '#CCFBF1',
            },
        },
    },
}
