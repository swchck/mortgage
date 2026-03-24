import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: process.env.VITE_BASE_PATH || '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['chart.js'],
          'xlsx': ['xlsx'],
          'vue-vendor': ['vue', 'pinia', 'vue-i18n'],
        },
      },
    },
  },
});
