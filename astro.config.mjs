import { defineConfig, passthroughImageService } from "astro/config";
import tailwind from "@astrojs/tailwind";

import netlify from "@astrojs/netlify/functions";

// https://astro.build/config
export default defineConfig({
  image: {
    service: passthroughImageService(),
  },
  output: "hybrid",
  integrations: [tailwind()],
  adapter: netlify(),
});
