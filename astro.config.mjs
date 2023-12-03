import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify/functions";

export default defineConfig({
  output: "hybrid",
  integrations: [tailwind()],
  adapter: netlify(),
});
