import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import path from "node:path"

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, "src/content/main.ts"),
        inject: path.resolve(__dirname, "src/inject/index.js"),
      },
      output: {
        entryFileNames(chunkInfo) {
          if (chunkInfo.name === "inject") {
            return "inject/index.js"
          }
          return "content/[name].js"
        },
        assetFileNames(assetInfo) {
          const name = assetInfo.name ?? ""
          if (name.endsWith(".css")) {
            return "content/style.css"
          }
          return "assets/[name]-[hash][extname]"
        },
      },
    },
  },
})
