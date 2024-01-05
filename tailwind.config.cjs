import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    fontFamily: {
      sans: ["Clash Display", fontFamily.sans],
      title: ["Jawbreak Sans", fontFamily.sans],
    },
    extend: {
      backgroundImage: {
        sur: "url('/sur/bg.svg')",
        oeste: "url('/oeste/bg.svg')",
        norte: "url('/norte/bg.svg')",
        este: "url('/este/bg.svg')",
        maestria: "url('/maestria/bg.svg')",
        "sur-image": "url('/sur/fuego.jpg')",
        "oeste-image": "url('/oeste/lucia.jpg')",
        "norte-image": "url('/norte/coca.jpg')",
        "este-image": "url('/este/temazcal.jpg')",
        "maestria-image": "url('/maestria/mishas.jpg')",
        "temazcal-image": "url('/temazcal.jpg')",
      },
      colors: {
        sur: "#ea4b8b",
        "sur-dark": "#542626",
        oeste: "#fbb03b",
        "oeste-dark": "#3a3230",
        norte: "#63c5ea",
        "norte-dark": "#3e5054",
        este: "#ddc7ff",
        "este-dark": "#7f59b0",
      },
    },
  },
  plugins: [],
};
