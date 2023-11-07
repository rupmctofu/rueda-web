/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    backgroundImage: {
      "sur-image": "url('/fuego.jpg')",
      "oeste-image": "url('/lucia.jpg')",
      "norte-image": "url('/coca.jpg')",
      "este-image": "url('/temazcal.jpg')",
    },
    fontFamily: {
      base: ["ClashDisplay", "system-ui"],
      title: ["Jawbreak", "system-ui"],
    },
    extend: {
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
