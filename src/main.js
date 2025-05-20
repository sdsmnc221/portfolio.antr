import { createWebHistory, createRouter } from 'vue-router';
import { createApp } from 'vue';

import App from './App.vue';
import Home from './Home.vue';

import prismic from '@utils/prismic';

const routes = [
  { path: '/', component: Home },
  { path: '/preview/:id', component: Home },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

createApp(App).use(router).use(prismic).mount('#app');
