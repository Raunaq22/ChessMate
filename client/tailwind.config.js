/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'chess-dark': "#444545",
        'chess-light': "#FDF0D5", 
        'chess-hover': "#A77E58",
        'primary': "#5C9EAD",
        'secondary': "#8D99AE"
      },
    },
  },
  plugins: [],
}