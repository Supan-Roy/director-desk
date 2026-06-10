/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#f6f6f7',
          100: '#e2e3e5',
          200: '#c4c5c8',
          300: '#a1a2a7',
          400: '#7a7b80',
          500: '#5c5d62',
          600: '#44454a',
          700: '#333439',
          800: '#222327',
          900: '#13141a',
          950: '#06060b',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          dim: '#7c3aed',
          glow: 'rgba(139, 92, 246, 0.15)',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Courier New"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        screenplay: ['"Courier New"', 'Courier', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
        card: '0 2px 8px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.05)',
        elevated: '0 8px 30px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.05)',
        'glow-accent': '0 0 20px rgba(139, 92, 246, 0.12), 0 0 40px rgba(139, 92, 246, 0.04)',
        'glow-green': '0 0 20px rgba(74, 222, 128, 0.1), 0 0 40px rgba(74, 222, 128, 0.03)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      animation: {
        'pulse-slow': 'pulse-active 2s ease-in-out infinite',
        'flow': 'flow-line 3s ease-in-out infinite',
        'shimmer': 'shimmer 4s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cinematic': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139, 92, 246, 0.08), transparent), radial-gradient(ellipse 60% 40% at 80% 60%, rgba(99, 55, 188, 0.04), transparent), radial-gradient(ellipse 50% 30% at 10% 80%, rgba(139, 92, 246, 0.03), transparent), #06060b',
      },
    },
  },
  plugins: [],
}
