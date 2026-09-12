import { defineConfig } from "rolldown";

export default defineConfig([
  {
    input: "src/index.ts",
    output: { dir: "dist", format: "esm", cleanDir: true },
    external: ["node:crypto", "node:dgram", "node:dns", "node:https", "node:http"],
  },
]);
