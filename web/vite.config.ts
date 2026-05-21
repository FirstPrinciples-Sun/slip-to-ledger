import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE ?? "./",
  server: { port: 5173, host: true },
  build: { target: "es2022", outDir: "dist", sourcemap: true },
  worker: { format: "es" },
});
