import sharedPreset from '../../packages/tailwind-preset/index.js'
/** @type {import('tailwindcss').Config} */
export default {
    presets: [sharedPreset],
    content: ['./index.html', './src/**/*.{js,jsx}'],
    // wired to CSS custom properties (see src/lib/theme.js + src/index.css :root defaults) so the
    // accent color is switchable at runtime from a theme picker, instead of a fixed build-time hex
    theme: { extend: { colors: { accent: 'var(--accent)', 'accent-soft': 'var(--accent-soft)' } } },
}
