import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#E8627C',
          light: '#F08A9E',
          dark: '#D04A64',
        },
        berry: {
          DEFAULT: '#8B1E3F',
          light: '#A83258',
          dark: '#6D1530',
        },
        dark: {
          DEFAULT: '#1A1A2E',
          light: '#252540',
          lighter: '#2E2E4A',
        },
        cream: '#FFF5F0',
        gold: {
          DEFAULT: '#F5C842',
          light: '#F8D76B',
          dark: '#D4A930',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Space Mono', 'monospace'],
      },
      borderRadius: {
        card: '20px',
      },
      animation: {
        'flame-pulse': 'flamePulse 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-out-left': 'slideOutLeft 0.3s ease-in',
        'slide-out-right': 'slideOutRight 0.3s ease-in',
        'heart-pop': 'heartPop 0.4s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        'counter-up': 'counterUp 0.3s ease-out',
      },
      keyframes: {
        flamePulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideOutLeft: {
          '0%': { opacity: '1', transform: 'translateX(0) rotate(0deg)' },
          '100%': { opacity: '0', transform: 'translateX(-120%) rotate(-15deg)' },
        },
        slideOutRight: {
          '0%': { opacity: '1', transform: 'translateX(0) rotate(0deg)' },
          '100%': { opacity: '0', transform: 'translateX(120%) rotate(15deg)' },
        },
        heartPop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        counterUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'flame-gradient': 'linear-gradient(135deg, #E8627C, #8B1E3F)',
        'flame-gradient-hover': 'linear-gradient(135deg, #F08A9E, #A83258)',
      },
    },
  },
  plugins: [],
};

export default config;
