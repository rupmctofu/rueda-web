/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    fontFamily: {
      base: ["ClashDisplay", "system-ui"],
      title: ["Jawbreak", "system-ui"],
    },
    extend: {
      backgroundImage: {
        "sur-image": "url('/fuego.jpg')",
        sur: "url('/sur-section-bg.svg')",
        "oeste-image": "url('/lucia.jpg')",
        oeste: "url('/oeste-section-bg.svg')",
        "norte-image": "url('/coca.jpg')",
        norte: "url('/norte-section-bg.svg')",
        "este-image": "url('/temazcal.jpg')",
        este: "url('/este-section-bg.svg')",
        "maestria-image": "url('/mishas.jpg')",
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
