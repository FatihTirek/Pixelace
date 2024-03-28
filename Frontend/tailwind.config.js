/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./dist/**/*.{html,js}"],
  theme: {
    extend: {
      screens: {
        'xs': '496px',
      },
      keyframes: {
        heartbeat: {
          'from': {
            transform: 'scale(.75)',
          },
          'to': {
            transform: 'scale(1)',
          }
        }
      },
      animation: {
        heartbeat: 'heartbeat 400ms cubic-bezier(.35, 2, .5, .7) infinite alternate',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}