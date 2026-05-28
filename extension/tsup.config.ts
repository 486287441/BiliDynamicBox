import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/content/main.ts"],
  outDir: "dist",
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: false,
  splitting: false,
  target: "es2022",
})
