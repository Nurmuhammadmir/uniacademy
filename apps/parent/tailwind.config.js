import sharedPreset from '../../packages/tailwind-preset/index.js'
/** @type {import('tailwindcss').Config} */
export default {
    presets: [sharedPreset],
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: { extend: { colors: { accent: '#D6497A', 'accent-soft': '#FBE4ED' } } },
}
