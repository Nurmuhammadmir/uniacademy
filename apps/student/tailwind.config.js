import sharedPreset from '../../packages/tailwind-preset/index.js'
/** @type {import('tailwindcss').Config} */
export default {
    presets: [sharedPreset],
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: { extend: { colors: { accent: '#D9714E', 'accent-soft': '#F6E1D6', gold: '#C9A15C', 'gold-soft': '#F5EBD3' } } },
}
