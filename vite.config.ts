import { defineConfig } from "vite";
export default defineConfig({
  build: { outDir: "dist/client" },
  server: { allowedHosts: ["localhost", "127.0.0.1"] },
});
