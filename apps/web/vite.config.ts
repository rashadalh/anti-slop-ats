import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, "../..");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    "process.env.EMAIL_HASH_PEPPER": JSON.stringify(
      process.env.EMAIL_HASH_PEPPER ?? "dev-email-pepper",
    ),
    "process.env.IP_HASH_PEPPER": JSON.stringify(
      process.env.IP_HASH_PEPPER ?? "dev-ip-pepper",
    ),
    "process.env.TYPESAFE_API_KEY": JSON.stringify(
      process.env.TYPESAFE_API_KEY ?? "",
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "node:crypto": path.resolve(rootDir, "src/lib/node-crypto-stub.ts"),
    },
  },
  build: {
    cssMinify: false,
  },
  server: {
    host: "127.0.0.1",
    port: Number(process.env.WEB_PORT) || 5173,
    fs: {
      allow: [repoRoot],
    },
  },
  preview: {
    host: "127.0.0.1",
    port: Number(process.env.WEB_PORT) || 4173,
  },
});
