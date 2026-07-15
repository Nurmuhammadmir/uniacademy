import sharedPreset from '../../packages/tailwind-preset/index.js'
/** @type {import('tailwindcss').Config} */
export default {
    presets: [sharedPreset],
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: { extend: { colors: { accent: '#2F9E5C', 'accent-soft': '#DCF3E4' } } },
}
