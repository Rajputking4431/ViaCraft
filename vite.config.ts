import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tanstack/react-router": path.resolve(__dirname, "./src/utils/router-compat.tsx"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase") || id.includes("supabase")) {
              return "supabase";
            }
            if (id.includes("react") || id.includes("scheduler")) {
              return "react-vendor";
            }
            if (id.includes("framer-motion")) {
              return "framer-motion";
            }
            if (id.includes("recharts") || id.includes("d3")) {
              return "recharts";
            }
            if (id.includes("lucide-react")) {
              return "lucide-react";
            }
            if (id.includes("@radix-ui") || id.includes("radix")) {
              return "radix";
            }
            return "vendor";
          }
        },
      },
    },
  },
});
