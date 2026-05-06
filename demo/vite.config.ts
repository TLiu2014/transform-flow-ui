import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Use the library source directly during demo dev for fast HMR.
      "transform-flow-ui": path.resolve(__dirname, "../src/index.ts"),
      "@": path.resolve(__dirname, "../src"),
    },
  },
});
