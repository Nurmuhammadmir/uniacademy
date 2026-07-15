// shared design system for all 4 UniAcademy apps - each app adds ONLY its own accent color on top
/** @type {import('tailwindcss').Config} */
module.exports = {
    theme: {
        extend: {
            colors: {
                bg: '#FBF8F4',
                'bg-elevated': '#FFFFFF',
                'bg-card': '#FFFFFF',
                ink: '#231F1A',
                muted: '#7A7266',
                hairline: '#E9E1D4',
            },
            fontFamily: {
                display: ['"Space Grotesk"', 'sans-serif'],
                body: ['"Inter"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
        },
    },
}
