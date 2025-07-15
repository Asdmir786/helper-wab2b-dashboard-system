/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#2563EB', // Blue 600 – darker accent for light mode
          dark: '#60A5FA',  // Blue 400 – lighter accent for dark mode
        },
        secondary: {
          light: '#4F46E5', // Indigo 600
          dark: '#818CF8',  // Indigo 400
        },
        background: {
          light: '#F8FAFC', // Gray-50 – softer than pure white
          dark: '#121212',  // Near-black per modern dark-UI guidance
        },
        surface: {
          light: '#FFFFFF', // Pure white cards on light mode
          dark: '#1E293B',  // Gray-800 – lighter surface for dark mode
        },
        text: {
          light: '#1F2937', // Gray-800
          dark: '#F1F5F9',  // Gray-100 – off-white to avoid pure white
        },
        border: {
          light: '#E2E8F0', // Gray-200
          dark: '#334155',  // Gray-700 – subtle borders in dark mode
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'custom': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'custom-dark': '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.12)',
      },
    },
  },
} 