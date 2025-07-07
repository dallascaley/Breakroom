import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ mode }) => {
  // Ensure env vars are loaded correctly
  const env = loadEnv(mode, new URL('.', import.meta.url).pathname)

  return {
    plugins: [vue(), vueJsx(), vueDevTools()],
    server: {
      host: '0.0.0.0',
      allowedHosts: [env.VITE_ALLOWED_HOST],
      proxy: {
        '/api': 'https://localhost:3000',
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
