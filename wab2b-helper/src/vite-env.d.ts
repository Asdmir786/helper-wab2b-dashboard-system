/// <reference types="vite/client" />

declare global {
  interface Window {
    __TAURI__?: Record<string, unknown>;
  }
}