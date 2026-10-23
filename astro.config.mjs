import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import netlify from "@astrojs/netlify/functions";

export default defineConfig({
  // Contenido estático prerenderizado; solo /api/form se ejecuta en el servidor.
  output: "hybrid",
  integrations: [tailwind()],
  adapter: netlify(),
});
