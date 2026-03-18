/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    '../../apps/mobile/App.{js,jsx,ts,tsx}',
    '../../apps/mobile/src/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f9d58',
        accent: '#ffd54f',
        billiard: {
          felt: '#1f5c45',
          rail: '#6b4f2a'
        }
      }
    }
  },
  plugins: []
};
