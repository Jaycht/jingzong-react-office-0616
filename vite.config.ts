import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { APP_VERSION } from './src/version'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-version',
      transformIndexHtml(html) {
        return html.replace(/%APP_VERSION%/g, APP_VERSION);
      },
    },
  ],
})
