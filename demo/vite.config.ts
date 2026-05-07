import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // `../src` alias otherwise resolves `react` from the repo root → duplicate React / broken hooks.
    dedupe: ["react", "react-dom"],
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      // Use the library source directly during demo dev for fast HMR.
      "transform-flow-ui": path.resolve(__dirname, "../src/index.ts"),
      "@": path.resolve(__dirname, "../src"),
    },
  },
});
