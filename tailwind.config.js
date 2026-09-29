/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: 'var(--color-accent)',
        'accent-soft': 'var(--color-accent-soft)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
        bubble: 'var(--color-bubble)',
        'bubble-out': 'var(--color-bubble-out)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.08)',
        soft: '0 2px 12px rgba(0,0,0,0.06)',
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
};
