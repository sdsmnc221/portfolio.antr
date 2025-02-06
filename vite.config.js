import { fileURLToPath, URL } from 'node:url';
import { VitePluginFonts } from 'vite-plugin-fonts';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePluginRadar } from 'vite-plugin-radar';
import { viteStaticCopy } from 'vite-plugin-static-copy';

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
      viteStaticCopy({
        targets: [
          {
            src: 'public/*',
            dest: '', // This will copy to root of dist
          },
          // If you need specific folders with their structure:
          {
            src: 'public/histoires-autrices/*',
            dest: 'histoires-autrices',
          },
          {
            src: 'public/img/*',
            dest: 'img',
          },
          {
            src: 'public/portfolio-v0/*',
            dest: 'portfolio-v0',
          },
          {
            src: 'public/portfolio-v1/*',
            dest: 'portfolio-v1',
          },
          {
            src: 'public/universea/*',
            dest: 'universea',
          },
          {
            src: 'public/vid/*',
            dest: 'vid',
          },
          {
            src: 'public/visia/*',
            dest: 'visia',
          },
          {
            src: 'public/*.pdf',
            dest: '',
          },
        ],
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
    build: {
      outDir: 'dist',
      // Ensure all Prismic data is fetched during build
      // ssr: true,
    },
  };
});
