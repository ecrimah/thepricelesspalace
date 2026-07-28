/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./{app,components,libs,pages,hooks}/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          brown: '#1e40af',
          carton: '#2563eb',
          cream: '#eff6ff',
          purple: '#1d4ed8',
          pink: '#93c5fd',
          coral: '#ef4444',
          yellow: '#60a5fa',
          tan: '#3b82f6',
          gold: '#60a5fa',
          oxblood: '#dc2626',
          rose: '#93c5fd',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
      animation: {
        'just-landed-scroll': 'just-landed-scroll 30s linear infinite',
        marquee: 'marquee 25s linear infinite',
      },
      keyframes: {
        'just-landed-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
