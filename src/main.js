import { createApp } from 'vue';
import App from './App.vue';
import prismic from '@utils/prismic';

createApp(App).use(prismic).mount('#app');
