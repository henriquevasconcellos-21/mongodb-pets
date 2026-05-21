import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  envDir: '..', // Read .env.* files from the monorepo root instead of frontend/
})
