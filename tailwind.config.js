/** @type {import('tailwindcss').Config} */
export default {
  mode: 'jit',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  safelist: [
  ],
  theme: {
    extend: {
      colors: {
        "base-black": "#1c1c1c",
        "base-gray": "#b0b0b0",
        "highlight-blue": "#4a90e2",
      },
    },
  },
  plugins: [],
}

