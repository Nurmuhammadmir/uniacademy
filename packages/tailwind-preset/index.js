// shared design system for all 4 UniAcademy apps - each app adds ONLY its own accent color on top
/** @type {import('tailwindcss').Config} */
module.exports = {
    theme: {
        extend: {
            // "Pure Cupertino" - Apple's own actual HIG neutrals, not an approximation via the
            // Tailwind slate family: #F5F5F7 is the exact gray Apple uses for System Preferences/
            // App Store page backgrounds, #1D1D1F is Apple's real near-black label color (a touch
            // warmer than a pure/blue-tinted black), #6E6E73/#D2D2D7 are Apple's real secondary-text
            // and separator grays. Chosen centrally here (rather than in each page) so the whole
            // platform shifts together through the existing bg/ink/muted/hairline utility classes
            // already used everywhere, with no per-page className changes needed.
            colors: {
                bg: '#F5F5F7',
                'bg-elevated': '#FFFFFF',
                'bg-card': '#FFFFFF',
                ink: '#1D1D1F',
                muted: '#6E6E73',
                hairline: '#D2D2D7',
            },
            fontFamily: {
                // platform-wide typeface (headings and body both) - "Clash Display" is reserved for
                // the UniAcademy wordmark alone (see Logo.jsx's own inline font-family), everything
                // else in the UI uses this one family so the app reads as a single coherent
                // typographic system rather than a display face + a separate body face.
                display: ['"Plus Jakarta Sans"', 'sans-serif'],
                body: ['"Plus Jakarta Sans"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
        },
    },
}
