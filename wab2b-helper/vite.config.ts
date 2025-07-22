import path from 'path';
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],

  clearScreen: false,

  build: {
    // Increased chunkSizeWarningLimit to 5000 kB (5 MB)
    chunkSizeWarningLimit: 5000,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react';
            }
            if (id.includes('@tauri-apps')) {
              return 'vendor-tauri';
            }
            if (
              id.includes('animejs') ||
              id.includes('react-markdown') ||
              id.includes('react-player') ||
              id.includes('lodash') ||
              id.includes('date-fns')
            ) {
              return 'vendor-ui';
            }
            return 'vendor';
          }
          if (id.includes(path.join('src', 'updater') + path.sep)) {
            return 'feature-updater';
          }
          // Split each component in src/components into its own chunk for better Suspense/dynamic import support
          if (id.includes(path.join('src', 'components') + path.sep)) {
            const parts = id.split(path.sep);
            const idx = parts.lastIndexOf('components');
            if (idx !== -1 && parts.length > idx + 1) {
              return 'component-' + parts[idx + 1].replace(/\.[jt]sx?$/, '');
            }
          }
        },
      },
    },
  },

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
