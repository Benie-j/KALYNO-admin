import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Le site sera publié sur https://benie-j.github.io/KALYNO-admin/
export default defineConfig({
  plugins: [vue()],
  base: '/KALYNO-admin/'
})
