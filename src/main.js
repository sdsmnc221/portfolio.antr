import { createApp } from 'vue';
import App from './App.vue';
import prismic from '@utils/prismic';
import 'virtual:fonts.css';

createApp(App).use(prismic).mount('#app');
