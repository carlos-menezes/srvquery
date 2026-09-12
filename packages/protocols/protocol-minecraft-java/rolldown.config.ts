import { defineConfig } from "rolldown";

export default defineConfig([
  {
    input: "src/index.ts",
    output: { dir: "dist", format: "esm", cleanDir: true },
    external: ["node:net", "node:dns", "node:https", "node:http", "node:dgram"],
  },
]);
