/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    fontFamily: {
      base: ["ClashDisplay", "system-ui"],
      title: ["Jawbreak", "system-ui"],
    },
    extend: {
      colors: {
        sur: "#ea4b8b",
        oeste: "#fbb03b",
        norte: "#61c1e5",
        este: "#7f59b0",
      },
    },
  },
  plugins: [],
};
