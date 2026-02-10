/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          DEFAULT: '#5A7C5E',
          hover: '#4A6B4E',
        },
        terracotta: {
          DEFAULT: '#B85C4A',
          hover: '#A54B3A',
        },
        base: '#F5F3F0',
        surface: '#FFFFFF',
        divider: '#D4CFC8',
        'soft-highlight': '#E8E4DF',
        'text-primary': '#1A1A1A',
        'text-secondary': '#5A5A5A',
        success: '#4A7C5A',
        pending: '#C49347',
        urgent: '#C94E4E',
        info: '#6E6E70',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(26, 26, 26, 0.08)',
        md: '0 4px 16px rgba(26, 26, 26, 0.12)',
        lg: '0 8px 32px rgba(26, 26, 26, 0.16)',
      },
    },
  },
  plugins: [],
};
