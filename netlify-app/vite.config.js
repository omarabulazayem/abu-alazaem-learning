import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const githubPages = process.env.GITHUB_PAGES === "true";

function routeCompatibility() {
  return {
    name: "abu-alazaem-route-compatibility",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("/src/") || !/\.[jt]sx?$/.test(id) || id.endsWith("/src/main.jsx")) return null;
      const transformed = code
        .replace(/\bwindow\.location\.pathname\b/g, "window.__ABU_ROUTE_PATH__()")
        .replace(/\blocation\.pathname\b/g, "window.__ABU_ROUTE_PATH__()");
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}

export default defineConfig({
  base: githubPages ? "/abu-alazaem-learning/" : "/",
  plugins: [routeCompatibility(), react()],
  build: { outDir: "dist" },
});
