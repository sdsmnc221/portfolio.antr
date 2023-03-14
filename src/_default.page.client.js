import { createApp } from './app';
import 'virtual:fonts.css';

export { render };

async function render(pageContext) {
  const app = createApp(pageContext);
  app.mount('#app');
}

/* To enable Client-side Routing:
export const clientRouting = true
// !! WARNING !! Before doing so, read https://vite-plugin-ssr.com/clientRouting */
