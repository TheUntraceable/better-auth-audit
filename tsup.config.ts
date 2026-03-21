import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/client.ts"],
  format: ["esm", "cjs"],
  external: ["better-auth", "zod"],
  dts: true,
  clean: true,
  outDir: "dist",
});
