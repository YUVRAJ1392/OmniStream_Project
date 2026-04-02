/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#050505',   // Pitch black background
          card: '#121212',   // Deep, rich gray for cards
          accent: '#e11d48', // Vibrant Crimson/Rose
          text: '#ffffff'
        }
      },
      boxShadow: {
        'neon': '0 0 20px rgba(225, 29, 72, 0.4)', // Custom glowing shadow
      }
    },
  },
  plugins: [],
}