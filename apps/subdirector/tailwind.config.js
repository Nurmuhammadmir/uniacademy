import sharedPreset from '../../packages/tailwind-preset/index.js'
/** @type {import('tailwindcss').Config} */
export default {
    presets: [sharedPreset],
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: { extend: { colors: { accent: '#4B4FE0', 'accent-soft': '#E6E6FB', gold: '#C9A15C' } } },
}
