import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA, type VitePWAOptions } from "vite-plugin-pwa";

const manifestForPlugIn: Partial<VitePWAOptions> = {
  registerType: "prompt",
  includeAssets: ["assets/*"],
  manifest:{
    name: "epub-reader-frontend",
    short_name: "epub-reader",
    description: "An epub reader PWA app for tracking progress with a database and backend",
    icons:[
      {
        src: "assets/icon512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ],
  theme_color: '#171717',
  background_color: '#f0e7db',
  display: "standalone",
  scope: '/',
  start_url: "/",
  orientation: 'portrait'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA(manifestForPlugIn)],
})
