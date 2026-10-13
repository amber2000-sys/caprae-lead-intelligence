/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Neutral scale — the product is almost entirely this. Colour is spent
        // only where it carries meaning.
        ink: {
          50: '#f7f7f5', 100: '#efefec', 200: '#e0e0dc', 300: '#d0d0d0',
          400: '#b0b0b0', 500: '#7c7c78', 600: '#5b5b57', 700: '#3a3a3a',
          800: '#2a2a2a', 900: '#1a1a1a', 950: '#0a0a0a',
        },
        // Single data hue. Every distribution chart uses this ramp and nothing
        // else — identity in those charts comes from the always-present label,
        // never from colour.
        data: {
          50: '#fffbea', 100: '#fff4c2', 200: '#fde58a', 300: '#f9d360',
          400: '#efc13e', 500: '#d8a719', 600: '#b88908', 700: '#8b6500',
          800: '#5c4300', 900: '#352600',
        },
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
      },
      boxShadow: {
        card: 'none',
        pop: 'none',
      },
    },
  },
  plugins: [],
};
