import { fileURLToPath, URL } from 'node:url';
import { VitePluginFonts } from 'vite-plugin-fonts';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePluginRadar } from 'vite-plugin-radar';
import ssr from 'vite-plugin-ssr/plugin';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      host: true,
    },
    plugins: [
      vue(),
      VitePluginFonts({
        google: {
          families: ['Montserrat', 'Major Mono Display', 'IBM Plex Mono', 'Pinyon Script'],
        },
      }),
      VitePluginRadar({
        // Google Analytics tag injection
        analytics: {
          id: env.ANALYTICS,
          disable: false,
        },
      }),
      ssr(),
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
  };
});
