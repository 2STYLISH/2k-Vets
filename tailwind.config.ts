import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 2K Veterans League — Light theme, Philippine flag-inspired
        navy: {
          DEFAULT: '#0033a0',
          50: '#e8edf8',
          100: '#c5d1ed',
          200: '#9db2e0',
          300: '#7593d3',
          400: '#4d74c6',
          500: '#0033a0',
          600: '#002a85',
          700: '#00206a',
          800: '#001750',
          900: '#0a0f2e',
        },
        'flag-red': {
          DEFAULT: '#ce1126',
          50: '#fce8eb',
          100: '#f8c5cc',
          200: '#f18e9a',
          300: '#ea5768',
          400: '#d9283d',
          500: '#ce1126',
          600: '#a90e1f',
          700: '#840b18',
          800: '#5f0811',
          900: '#3a050a',
        },
        'flag-gold': {
          DEFAULT: '#d4a017',
          50: '#fdf6e3',
          100: '#faeab5',
          200: '#f5d56e',
          300: '#e8be2e',
          400: '#d4a017',
          500: '#b88b0f',
          600: '#9a730c',
          700: '#7c5c09',
          800: '#5e4507',
          900: '#402e04',
        },
        // Surface scale — light translucent panels
        surface: {
          50: '#ffffff',
          100: '#f8f9fa',
          200: '#f1f3f5',
          300: '#e9ecef',
          400: '#dee2e6',
          500: '#ced4da',
          600: '#adb5bd',
          700: '#6c757d',
          800: '#495057',
          900: '#343a40',
          950: '#212529',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      backgroundImage: {
        'grid-subtle': 'repeating-linear-gradient(0deg, rgba(0,51,160,0.03) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, rgba(0,51,160,0.03) 0 1px, transparent 1px 40px)',
        'logo': "url('/bg-logo.png')",
        'home': "url('/bg-home.png')",
        'other': "url('/bg-other.png')",
        'container': "url('/bg-container.png')",
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'slide-up': 'slideUp 0.5s ease-out both',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
