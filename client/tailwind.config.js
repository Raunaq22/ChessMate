/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Define your custom colors here
        'chess-dark': '#769656',
        'chess-light': '#eeeed2',
        'chess-hover': '#baca44',
        'primary': '#1e40af',
        'secondary': '#1e293b',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}