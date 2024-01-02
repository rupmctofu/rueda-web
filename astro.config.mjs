import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify/functions";

export default defineConfig({
  output: "server",
  integrations: [tailwind()],
  adapter: netlify(),
});
