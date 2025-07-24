/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        1: '4px',
        2: '8px', 
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        14: '56px',
        16: '64px',
      },
      borderRadius: {
        lg: '12px',
      },
      colors: {
        gray: {
          100: '#F7F8FA',
          200: '#E2E8F0', 
          400: '#A0A0A0',
          700: '#4A4A4A',
          900: '#1F1F1F',
        },
        blue: {
          600: '#3182CE',
        },
        green: {
          100: '#E6FFFA',
          500: '#38A169',
        },
        red: {
          100: '#FFF5F5', 
          500: '#E53E3E',
        },
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
} 