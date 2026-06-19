import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#FFFFFF',
          100: '#FFFFFF',
          200: '#D0D0D0',
          300: '#D0D0D0',
          400: '#8A8A8A',
          500: '#8A8A8A',
          600: '#252525',
          700: '#1E1E1E',
          800: '#101010',
          900: '#0B0B0B',
          950: '#050505',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          dim: '#7c3aed',
          glow: 'transparent',
        },
      },
      fontFamily: {
        sans: ['"Sofia Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Courier New"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['"Sofia Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        screenplay: ['"Courier New"', 'Courier', 'monospace'],
      },
      boxShadow: {
        subtle: 'none',
        card: 'none',
        elevated: 'none',
        'glow-accent': 'none',
        'glow-green': 'none',
      },
      borderRadius: {
        xl: '0.5rem',
        '2xl': '0.5rem',
      },
      animation: {
        'pulse-slow': 'pulse-active 2s ease-in-out infinite',
        'flow': 'flow-line 3s ease-in-out infinite',
        'shimmer': 'shimmer 4s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cinematic': 'none',
      },
    },
  },
  plugins: [typography],
}
