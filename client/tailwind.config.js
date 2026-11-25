import defaultTheme from 'tailwindcss/defaultTheme'

/** Shortlist design tokens */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', ...defaultTheme.fontFamily.sans],
        mono: ['"Geist Mono"', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        // Navy/charcoal foundation
        ink: {
          50: '#F6F7FA',
          100: '#ECEEF3',
          200: '#DADEE7',
          300: '#B9C0CE',
          400: '#8A93A6',
          500: '#5E6779',
          600: '#434B5C',
          700: '#2D3444',
          800: '#1A2030',
          900: '#0F1422',
          950: '#080B15',
        },
        // Electric indigo accent
        brand: {
          50: '#EEF1FF',
          100: '#E0E5FF',
          200: '#C5CDFF',
          300: '#9DA9FF',
          400: '#7381FF',
          500: '#5260FA',
          600: '#3F47EE',
          700: '#3237D2',
          800: '#2B30A9',
          900: '#282E85',
        },
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 20 34 / 0.04), 0 1px 3px 0 rgb(15 20 34 / 0.05)',
        elevated: '0 12px 32px -12px rgb(15 20 34 / 0.18), 0 2px 6px -2px rgb(15 20 34 / 0.06)',
        focus: '0 0 0 3px rgb(82 96 250 / 0.25)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-in-left': 'slide-in-left 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
