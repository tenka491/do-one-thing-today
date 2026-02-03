import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

export default defineConfig({
  base: '/do-one-thing-today/', // important for GitHub Pages
  define:{
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'], // optional
      manifest: {
        name: 'Do One Thing Today',
        short_name: 'One Thing',
        start_url: '/do-one-thing-today/', // <--- important
        description: 'Focus on one thing per day.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
