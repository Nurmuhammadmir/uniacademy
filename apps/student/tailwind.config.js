import sharedPreset from '../../packages/tailwind-preset/index.js'
/** @type {import('tailwindcss').Config} */
export default {
    presets: [sharedPreset],
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: { extend: { colors: { accent: '#1C7ED6', 'accent-soft': '#DCEEFC', gold: '#C9A15C', 'gold-soft': '#F5EBD3' } } },
}
