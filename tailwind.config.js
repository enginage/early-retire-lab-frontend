/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Premium Dark Theme Colors
                'wealth-dark': '#0a0f1c', // Deep blue/black background
                'wealth-card': '#111827', // Card background
                'wealth-gold': '#d4af37', // Accent gold
                'wealth-green': '#10b981', // Positive/profit green
                'wealth-text': '#e5e7eb', // Primary text
                'wealth-muted': '#9ca3af', // Secondary text
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
