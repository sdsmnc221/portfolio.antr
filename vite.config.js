import { fileURLToPath, URL } from 'node:url';
import { VitePluginFonts } from 'vite-plugin-fonts';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePluginRadar } from 'vite-plugin-radar';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
  },
  plugins: [
    vue(),
    VitePluginFonts({
      google: {
        families: ['Montserrat', 'Major Mono Display', 'Yeseva One'],
      },
    }),
    VitePluginRadar({
      // Google Analytics tag injection
      analytics: {
        id: process.env.VITE_ANALYTICS,
        disable: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/components/modules', import.meta.url)),
      '@elements': fileURLToPath(new URL('./src/components/elements', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "./src/assets/scss/vars/index.scss";`,
      },
    },
  },
});
