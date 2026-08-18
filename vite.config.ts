import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import path from "node:path"

export default defineConfig({
  plugins: [vue()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
  },
})
