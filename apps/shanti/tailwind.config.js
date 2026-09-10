import sharedPreset from '../../packages/tailwind-preset/index.js'
/** @type {import('tailwindcss').Config} */
export default {
    // light-only, no dark mode - the shared preset's bg/bg-elevated/bg-card/ink/muted/hairline are
    // already static hex values that work as-is, matching admin's exact "Pure Cupertino" palette.
    presets: [sharedPreset],
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                accent: '#0D9488',
                'accent-soft': '#CCFBF1',
            },
            fontFamily: {
                // the "Lamussa" wordmark only - a thick brush-script face, never used for body text
                logo: ['Alex Brush', 'cursive'],
            },
        },
    },
}
