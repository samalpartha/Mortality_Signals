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
        // Custom mortality signals palette - using CSS variables for theme support
        signal: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: 'var(--color-accent)',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        severity: {
          critical: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
          success: '#10b981',
        },
        observatory: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          elevated: 'var(--color-elevated)',
          border: 'var(--color-border)',
          muted: 'var(--color-muted)',
          text: 'var(--color-text)',
        }
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(34, 197, 94, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
