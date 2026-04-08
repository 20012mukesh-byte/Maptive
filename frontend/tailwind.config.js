/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        industrial: {
          bg: '#f0f9ff',
          panel: 'rgba(255,255,255,0.3)',
          border: 'rgba(255,255,255,0.4)',
        },
      },
      boxShadow: {
        glass: '0 22px 50px rgba(148, 163, 184, 0.18)',
        failure: '0 0 0 2px rgba(255,45,85,0.65), 0 0 24px rgba(255,45,85,0.45)',
      },
      keyframes: {
        'pulse-failure': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,45,85,0.55)' },
          '50%': { boxShadow: '0 0 0 12px rgba(255,45,85,0)' },
        },
      },
      animation: {
        'pulse-failure': 'pulse-failure 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
