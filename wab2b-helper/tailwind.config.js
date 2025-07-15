/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#3B82F6', // Blue
          dark: '#60A5FA',
        },
        secondary: {
          light: '#6366F1', // Indigo
          dark: '#818CF8',
        },
        background: {
          light: '#FFFFFF',
          dark: '#1F2937',
        },
        surface: {
          light: '#F3F4F6',
          dark: '#374151',
        },
        text: {
          light: '#1F2937',
          dark: '#F9FAFB',
        },
        border: {
          light: '#E5E7EB',
          dark: '#4B5563',
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