/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Sophisticated editorial neutral palette: warm off-white, charcoal, deep navy obsidian
        neutral: {
          50: '#faf9f6',
          100: '#f4f3ef',
          200: '#e7e5df',
          300: '#d5d2c9',
          400: '#a3a095',
          500: '#737067',
          600: '#525049',
          700: '#383632',
          800: '#22211e',
          850: '#191816',
          900: '#121110',
          950: '#0b0c0e',
        },
        editorial: {
          light: '#faf9f6',
          cream: '#f2f0ea',
          sand: '#e8e5dc',
          charcoal: '#14161f',
          surface: '#181b26',
          border: '#2a2e40',
          dark: '#0e1017',
        },
        // Restrained weather data accents (blue/cyan ONLY for weather data)
        weather: {
          sky: '#38bdf8',
          rain: '#0284c7',
          cyan: '#06b6d4',
          indigo: '#6366f1',
        },
        // Warning accents (orange/red ONLY for warnings)
        warning: {
          low: '#22c55e',
          moderate: '#f59e0b',
          high: '#f97316',
          critical: '#ef4444',
        },
        // Verified & status health accents (green ONLY for verified/health)
        status: {
          verified: '#10b981',
          pending: '#0284c7',
          rejected: '#ef4444',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'editorial': '0 10px 30px -10px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
        'editorial-light': '0 10px 30px -10px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
        'glow-sky': '0 0 20px -5px rgba(56, 189, 248, 0.3)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

